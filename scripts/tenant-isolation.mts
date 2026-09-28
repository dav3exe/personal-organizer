/**
 * Tenant-isolation check: proves user A cannot GET, PATCH, or DELETE user B's
 * to-dos or notes, and that A's list never contains B's data.
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
  check(del.status === 404, `${singular}: other user DELETE -> 404`, `got ${del.status}`);

  const list = await request("GET", `/api/${kind}`, intruder);
  const items = ((list.body.data as Json | undefined)?.[kind] ?? []) as Json[];
  check(!items.some((item) => item.id === id), `${singular}: not in other user's list`);

  const anonymous = await request("GET", url);
  check(anonymous.status === 401, `${singular}: no session -> 401`, `got ${anonymous.status}`);

  const after = await request("GET", url, owner);
  check(
    after.status === 200 && dataField(after, singular).title === createBody.title,
    `${singular}: owner's copy unchanged after attempts`,
    `got ${after.status} ${JSON.stringify(after.body)}`
  );

  const cleanup = await request("DELETE", url, owner);
  check(cleanup.status === 200, `${singular}: owner can delete (cleanup)`, `got ${cleanup.status}`);
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
