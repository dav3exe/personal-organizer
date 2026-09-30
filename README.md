# Personal Organizer

**Live app:** https://personal-organizer-nu-eosin.vercel.app

A to-do and notes app with a trash for deleted items and one-click sample data. It has two modes:

- **Local mode (default).** No sign-up. To-dos and notes are saved in your browser's `localStorage`.
- **Multi-tenant mode.** Users register and sign in, data lives in MongoDB, and each account's data is fully isolated. See [How tenant isolation works](#how-tenant-isolation-works).

Multi-tenancy is **turned off for now**, not removed. All of its code, routes and checks are still in the project. See [Modes](#modes).

**Reviewing it?** Open the app and click **Load sample data** in the navbar. You'll see open, overdue, due-today and completed to-dos, notes, and items in the trash. Click **Clear all** to go back to the empty state.

## Features

- **To-dos:** add, edit, complete, and delete, with optional description and due date. Overdue items are highlighted.
- **Notes:** add, edit, and delete.
- **Trash (soft delete):** deleting a to-do or note moves it to the **Trash** page, and the toast has an **Undo** button. From the trash you can **restore** an item, or **delete it forever** after a warning. **Empty trash** removes everything in it after a warning. The navbar shows how many items are in the trash.
- **Sample data:** **Load sample data** fills the app in one click, and **Clear all** (with a warning) takes it back to empty. Load only appears when there's no data, so it never mixes with or duplicates your own items.
- **Accounts** (multi-tenant mode only): register, sign in, sign out. Sessions are JWTs in an httpOnly cookie.
- **Live username check** (multi-tenant mode only): while you type, the sign-up form checks availability using a bloom filter.
- Responsive, mobile-first UI with dark and light mode, loading, empty and error states, and toast feedback.

## Modes

The mode is set by one build-time flag in [lib/features.ts](lib/features.ts):

| `NEXT_PUBLIC_MULTI_TENANCY` | Mode | Where data lives | Sign-in |
| --- | --- | --- | --- |
| unset or `false` (default) | Local | This browser's `localStorage` (keys start with `personal-organizer:`) | None. `/login` and `/register` redirect to `/todos`, and the register, login and username-check APIs return `404`. |
| `true` | Multi-tenant | MongoDB, scoped per user | Required. `proxy.ts` and the dashboard layout redirect signed-out users to `/login`. |

It's a `NEXT_PUBLIC_` variable, so it's baked in **at build time**. After changing it, restart `npm run dev`, or redeploy on Vercel.

**How the switch works:** the hooks in `hooks/` never call `fetch` or `localStorage` directly. They talk to one `Collection` interface ([lib/data/collection.ts](lib/data/collection.ts)), which has two implementations:

- `remoteCollection` calls the route handlers.
- `localCollection` ([lib/data/local-collection.ts](lib/data/local-collection.ts)) reads and writes `localStorage`. It validates input with the same Zod schemas as the API, and returns the same error shape so forms show field errors in both modes.

[lib/data/todos.ts](lib/data/todos.ts) and [lib/data/notes.ts](lib/data/notes.ts) pick an implementation based on the flag. Changes made in one browser tab show up in the app's other open tabs.

In local mode, data belongs to this browser on this device. Clearing site data deletes it, and it isn't shared between browsers.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router only), TypeScript (strict) |
| Database | MongoDB with Mongoose (multi-tenant mode), browser `localStorage` (local mode) |
| Auth | bcrypt (`bcryptjs`) password hashing, JWT (`jose`, HS256) in an httpOnly cookie |
| Validation | Zod, with schemas shared by client and server |
| UI | Tailwind CSS v4, shadcn/ui (Radix), lucide icons, Sonner toasts, next-themes |
| Client data | TanStack React Query, React Hook Form |

## Getting started

Requirements: Node.js 22.18+ or 24+. Multi-tenant mode also needs a MongoDB database (local or Atlas).

```bash
npm install
cp .env.example .env    # then fill in the values
npm run dev             # http://localhost:3000
```

Local mode works with no environment variables at all.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_MULTI_TENANCY` | no | `true` turns on accounts and MongoDB storage. Default is local mode. Read at build time. |
| `MONGODB_URI` | multi-tenant mode | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | multi-tenant mode | Secret for signing session tokens, **at least 32 characters**. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `MONGODB_DNS_SERVERS` | local only | e.g. `8.8.8.8,8.8.4.4`. Set this only if connecting to Atlas fails locally with `querySrv ECONNREFUSED`. **Never set it on Vercel.** |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:isolation` | Tenant-isolation check against a running server in multi-tenant mode (see below) |

## Trash (soft delete)

Deleting never removes data straight away. It sets `deletedAt` on the item, which moves it to the trash.

- **Lists** show active items only (`deletedAt: null`). The trash lists items with `deletedAt` set, most recently deleted first.
- **Editing** only works on active items. Restore a trashed item before changing it.
- **Delete forever** only works on an item that's already in the trash. It's always behind a warning modal, and so are **Empty trash** and **Clear all**.
- On the server, soft delete follows the same tenancy rules as everything else. Every trash, restore and permanent-delete query filters by `{ _id, userId }`, and another user's item returns `404`. The shared filters are in [lib/soft-delete.ts](lib/soft-delete.ts).
- To-dos and notes created before soft delete existed have no `deletedAt` field. They count as active, because `{ deletedAt: null }` also matches a missing field.

## How tenant isolation works

This applies in multi-tenant mode.

1. **Identity comes only from the session.** Every API handler calls `requireSession()` ([lib/auth.ts](lib/auth.ts)), which verifies the JWT from the httpOnly cookie. `userId` is never read from the request body, params, or query. Unknown body fields such as `userId` are stripped by Zod.
2. **Every query is scoped.** Services always filter by both the record id and the owner, e.g. `Todo.findOne({ _id, userId })`, `findOneAndUpdate({ _id, userId }, …)`, `findOneAndDelete({ _id, userId })`. They never use `findById` alone. See [services/todo-service.ts](services/todo-service.ts) and [services/note-service.ts](services/note-service.ts).
3. **404, not 403.** A record owned by someone else, a record that doesn't exist, and a malformed id all return the same `404 { message, code: "NOT_FOUND" }`. The API never confirms that another user's record exists.
4. **Ids are validated** as 24-character hex ObjectIds before any query.
5. **Defence in depth.** [proxy.ts](proxy.ts) redirects signed-out users away from `/todos`, `/notes` and `/trash`, but API route handlers verify the session themselves and never rely on the proxy. Sign-in and sign-out clear the client-side query cache so one account's data can't flash up for another.

When multi-tenancy is off, sign-up and sign-in return `404`. Without a session, every to-do and note API returns `401`, so the server-side data can't be reached.

### Proving it

`npm run test:isolation` runs [scripts/tenant-isolation.mts](scripts/tenant-isolation.mts). It registers two throwaway users, then checks that user B gets `404` when trying to **GET, PATCH, DELETE (trash), restore, or permanently delete** user A's to-do and note. It also checks:

- A's items never appear in B's list or B's trash.
- Requests without a session get `401`.
- A's data is unchanged afterwards.
- A can trash, restore, and delete forever, and permanent delete refuses an item that isn't in the trash.

The server under test must be built with multi-tenancy on:

```bash
NEXT_PUBLIC_MULTI_TENANCY=true npm run dev                # terminal 1
npm run test:isolation                                    # terminal 2
BASE_URL=https://<your-multi-tenant-deployment> npm run test:isolation   # or against a deployment
```

The live app currently runs in local mode, so this check can't run against it. Run it locally, or against a deployment with the flag on.

The script permanently deletes the to-dos and notes it creates. The two `iso_a_*` / `iso_b_*` test users stay in the database.

## Username availability (bloom filter)

This applies in multi-tenant mode. Usernames are unique, so the sign-up form checks availability as you type (debounced, 400 ms) via `GET /api/auth/username-check?username=…`.

- A [bloom filter](lib/bloom.ts) (sized for 100,000 names at a 1% false-positive rate, about 117 KB) is seeded from existing usernames on first use and updated on each registration.
- **"Definitely not in the filter"** means the name is available, with no database query.
- **"Probably taken"** is always **confirmed with a real database lookup** before the user is told the name is taken, because bloom filters can give false positives but never false negatives.
- The **unique index** on `username` is the final guard against two people registering the same name at once. Registration returns `409` in that case.
- On serverless platforms each instance has its own in-memory filter, so the database is always the source of truth.

## API

The API is used in multi-tenant mode. All responses are JSON. Success responses look like `{ data: … }`. Errors look like `{ message, code }`, with an optional `fields` object of per-field messages for validation and conflict errors.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | – | `{ username, email, password }` → `201 { data: { user } }`, sets the session cookie. `404` when multi-tenancy is off |
| POST | `/api/auth/login` | – | `{ email, password }` → `{ data: { user } }`. Any failure returns `401 "Invalid credentials"`. `404` when multi-tenancy is off |
| POST | `/api/auth/logout` | – | Clears the session cookie |
| GET | `/api/auth/me` | ✓ | Current user (never includes the password hash) |
| GET | `/api/auth/username-check?username=` | – | `{ data: { username, available } }`. `404` when multi-tenancy is off |
| GET / POST | `/api/todos` | ✓ | List your active to-dos (newest first), or `?view=trash` for the trash / create one |
| GET / PATCH | `/api/todos/:id` | ✓ | Read / update one of **your** to-dos (update: active only) |
| DELETE | `/api/todos/:id` | ✓ | Move to the trash (soft delete) → `{ data: { todo } }` with `deletedAt` set |
| POST | `/api/todos/:id/restore` | ✓ | Move out of the trash |
| DELETE | `/api/todos/:id/permanent` | ✓ | Delete forever. Only for an item already in the trash, `404` otherwise |
| GET / POST | `/api/notes` | ✓ | Same as to-dos, including `?view=trash` |
| GET / PATCH / DELETE | `/api/notes/:id` | ✓ | Same as to-dos |
| POST | `/api/notes/:id/restore` | ✓ | Same as to-dos |
| DELETE | `/api/notes/:id/permanent` | ✓ | Same as to-dos |

To-do fields: `title` (required, ≤120), `description` (≤1000), `dueDate` (`YYYY-MM-DD`), `completed`. In `PATCH`, omitted fields stay unchanged and `null` clears `description` or `dueDate`. Note fields: `title` (required, ≤120) and `content` (required, ≤10,000). Both include `deletedAt` (`null`, or when the item was moved to the trash).

Status codes: `400` for validation errors or invalid JSON, `401` when there is no valid session or credentials are wrong, `404` when a record is not found or not yours, `409` when a username or email is taken, and `500` for unexpected errors (logged server-side).

## Project structure

```
app/
  (auth)/login, (auth)/register     sign-in pages (multi-tenant mode)
  (dashboard)/todos, /notes, /trash app pages (layout checks the session in multi-tenant mode)
  api/…                             route handlers: validate → call service → respond
components/
  ui/                               shadcn components
  auth/ todos/ notes/ trash/        feature components
  shared/                           navbar, dialogs, sample-data controls, empty/error states
hooks/                              React Query hooks (use-todos, use-notes, use-trash, use-app-data, use-auth)
lib/
  data/                             Collection interface, remote (API) and local (localStorage) stores, sample data
  features.ts                       NEXT_PUBLIC_MULTI_TENANCY flag
  soft-delete.ts                    active / trash query filters
  …                                 db, auth (JWT/cookies), api-error, api-client, bloom, validation
models/                             Mongoose models (User, Todo, Note)
schemas/                            Zod schemas shared by client and server
services/                           business logic, all queries scoped by userId
proxy.ts                            redirects signed-out users (Next.js 16's name for middleware)
scripts/tenant-isolation.mts        isolation check
```

## Deploying to Vercel

**Local mode (current):** import the repo into Vercel and deploy. No environment variables are needed.

**Multi-tenant mode:**

1. **Atlas:** in *Network Access*, allow `0.0.0.0/0` (Vercel has no fixed IPs). Create a database user and copy the connection string.
2. **Vercel:** in *Settings → Environment Variables*, set `NEXT_PUBLIC_MULTI_TENANCY=true`, `MONGODB_URI` and `JWT_SECRET`. Do **not** set `MONGODB_DNS_SERVERS`. Redeploy after changing the flag, because it's read at build time.
3. Before deploying, run `npm run build` locally to catch build errors.
4. After deploying, run `BASE_URL=https://<your-app>.vercel.app npm run test:isolation`.

Serverless notes: the Mongoose connection is cached on `globalThis` so warm invocations reuse it. Logging uses plain `console`, with no logger transports.

## Security notes

- Passwords are hashed with bcrypt (cost 12). Passwords over 72 bytes are rejected because bcrypt would silently ignore the extra bytes.
- A failed login takes the same time whether or not the email exists (a dummy hash is compared), so response timing doesn't reveal which emails are registered.
- The session cookie is `httpOnly`, `sameSite=lax`, `secure` in production, and expires after 7 days. It holds only the user id.
- The `?from=` redirect after sign-in only accepts same-site paths, which prevents open redirects.
- Local mode stores data unencrypted in `localStorage`, like any browser-only app. Anyone with access to the browser profile can read it, so don't use it for sensitive notes.
- **Not included (possible next steps):** rate limiting on login and sign-up, email verification, password reset, automatic purging of old trash, and pagination for very long lists.
