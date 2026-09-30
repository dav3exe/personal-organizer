/**
 * Tenant-isolation check: proves user A cannot GET, PATCH, DELETE (trash),
 * restore, or permanently delete user B's to-dos or notes, and that neither
 * A's list nor A's trash ever contains B's data.
 *
 * Needs multi-tenancy on (NEXT_PUBLIC_MULTI_TENANCY=true at build time).
 *
 * Usage (with the app running):
 *   npm run test:isolation                          # against http://localhost:3000
 *   BASE_URL=https://your-app.vercel.app npm run test:isolation
 *
 * It registers two throwaway users (iso_a_xxxxxx / iso_b_xxxxxx), deletes the
 * to-dos and notes it creates, and exits with code 1 if any check fails.
 * The two test users stay in the database; remove them manually if you like.
 */

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const COOKIE_NAME = "po_session";

type Json = Record<string, unknown>;
type Result = { status: number; body: Json };
type User = { name: string; cookie: string };

let failures = 0;

function check(condition: boolean, label: string, detail = ""): void {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${!condition && detail ? `\n      ${detail}` : ""}`);
  if (!condition) failures++;
}

async function request(method: string, path: string, user?: User, body?: Json): Promise<Result & { setCookie: string }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(user ? { Cookie: `${COOKIE_NAME}=${user.cookie}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json().catch(() => ({}))) as Json;
  return { status: response.status, body: json, setCookie: response.headers.get("set-cookie") ?? "" };
}

async function register(prefix: string): Promise<User> {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  const name = `${prefix}_${suffix}`;
  const res = await request("POST", "/api/auth/register", undefined, {
    username: name,
    email: `${name}@isolation-test.invalid`,
    password: `pw-${crypto.randomUUID()}`,
  });
  const cookie = res.setCookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1];
  if (res.status === 404) {
    throw new Error("Accounts are turned off. Build with NEXT_PUBLIC_MULTI_TENANCY=true to run this check.");
  }
  if (res.status !== 201 || !cookie) {
    throw new Error(`Could not register ${name}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { name, cookie };
}

function dataField(res: Result, key: string): Json {
  return ((res.body.data as Json | undefined)?.[key] ?? {}) as Json;
}

async function checkResource(kind: "todos" | "notes", owner: User, intruder: User): Promise<void> {
  const singular = kind === "todos" ? "todo" : "note";
  const createBody = kind === "todos" ? { title: "Owner's private to-do" } : { title: "Owner's private note", content: "secret" };

  const created = await request("POST", `/api/${kind}`, owner, createBody);
  check(created.status === 201, `${singular}: owner can create`, `got ${created.status}`);
  const id = String(dataField(created, singular).id ?? "");
  const url = `/api/${kind}/${id}`;

  const get = await request("GET", url, intruder);
  check(get.status === 404, `${singular}: other user GET -> 404`, `got ${get.status}`);

  const patch = await request("PATCH", url, intruder, { title: "hacked" });
  check(patch.status === 404, `${singular}: other user PATCH -> 404`, `got ${patch.status}`);

  const del = await request("DELETE", url, intruder);
  check(del.status === 404, `${singular}: other user DELETE (trash) -> 404`, `got ${del.status}`);

  const listIds = async (user: User, view: "active" | "trash") => {
    const list = await request("GET", `/api/${kind}?view=${view}`, user);
    return (((list.body.data as Json | undefined)?.[kind] ?? []) as Json[]).map((item) => item.id);
  };
  check(!(await listIds(intruder, "active")).includes(id), `${singular}: not in other user's list`);

  // Owner moves it to the trash; the other user still can't see or touch it.
  const trashed = await request("DELETE", url, owner);
  check(
    trashed.status === 200 && dataField(trashed, singular).deletedAt !== null,
    `${singular}: owner can move to trash`,
    `got ${trashed.status} ${JSON.stringify(trashed.body)}`
  );
  check((await listIds(owner, "trash")).includes(id), `${singular}: in owner's trash`);
  check(!(await listIds(intruder, "trash")).includes(id), `${singular}: not in other user's trash`);

  const restore = await request("POST", `${url}/restore`, intruder);
  check(restore.status === 404, `${singular}: other user restore -> 404`, `got ${restore.status}`);

  const destroy = await request("DELETE", `${url}/permanent`, intruder);
  check(destroy.status === 404, `${singular}: other user permanent delete -> 404`, `got ${destroy.status}`);

  const restored = await request("POST", `${url}/restore`, owner);
  check(restored.status === 200, `${singular}: owner can restore`, `got ${restored.status}`);

  const anonymous = await request("GET", url);
  check(anonymous.status === 401, `${singular}: no session -> 401`, `got ${anonymous.status}`);

  const after = await request("GET", url, owner);
  check(
    after.status === 200 && dataField(after, singular).title === createBody.title,
    `${singular}: owner's copy unchanged after attempts`,
    `got ${after.status} ${JSON.stringify(after.body)}`
  );

  // Cleanup: trash, then delete for good (permanent delete only works from the trash).
  const activeDelete = await request("DELETE", `${url}/permanent`, owner);
  check(activeDelete.status === 404, `${singular}: permanent delete of an active item -> 404`, `got ${activeDelete.status}`);
  await request("DELETE", url, owner);
  const cleanup = await request("DELETE", `${url}/permanent`, owner);
  check(cleanup.status === 200, `${singular}: owner can delete forever (cleanup)`, `got ${cleanup.status}`);
  const gone = await request("GET", url, owner);
  check(gone.status === 404, `${singular}: gone after permanent delete`, `got ${gone.status}`);
}

try {
  console.log(`Tenant-isolation check against ${BASE_URL}\n`);
  const userA = await register("iso_a");
  const userB = await register("iso_b");
  console.log(`Users: ${userA.name} (owner), ${userB.name} (other user)\n`);

  await checkResource("todos", userA, userB);
  await checkResource("notes", userA, userB);
} catch (error) {
  failures++;
  console.error(`ERROR  ${error instanceof Error ? error.message : String(error)}`);
}

console.log(failures === 0 ? "\nAll isolation checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
