# Personal Organizer

**Live app:** https://personal-organizer-nu-eosin.vercel.app

A multi-tenant to-do and notes app. Users register, sign in, and manage their own to-dos and notes. Each account's data is fully isolated from every other account.

**Feature of choice: multi-tenancy.** A user can never read, edit, or delete another user's data, even by guessing IDs. See [How tenant isolation works](#how-tenant-isolation-works).

## Features

- **Accounts:** register, sign in, sign out. Sessions are JWTs in an httpOnly cookie.
- **To-dos:** add, edit, complete, and delete, with optional description and due date. Overdue items are highlighted.
- **Notes:** add, edit, and delete.
- **Live username check:** while you type, the sign-up form checks availability using a bloom filter.
- Responsive, mobile-first UI with dark and light mode, loading, empty and error states, and toast feedback.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router only), TypeScript (strict) |
| Database | MongoDB with Mongoose |
| Auth | bcrypt (`bcryptjs`) password hashing, JWT (`jose`, HS256) in an httpOnly cookie |
| Validation | Zod, with schemas shared by client and server |
| UI | Tailwind CSS v4, shadcn/ui (Radix), lucide icons, Sonner toasts, next-themes |
| Client data | TanStack React Query, React Hook Form |

## Getting started

Requirements: Node.js 22.18+ or 24+, and a MongoDB database (local or Atlas).

```bash
npm install
cp .env.example .env    # then fill in the values
npm run dev             # http://localhost:3000
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | yes | Secret for signing session tokens, **at least 32 characters**. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `MONGODB_DNS_SERVERS` | local only | e.g. `8.8.8.8,8.8.4.4`. Set this only if connecting to Atlas fails locally with `querySrv ECONNREFUSED`. **Never set it on Vercel.** |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:isolation` | Tenant-isolation check against a running server (see below) |

## How tenant isolation works

1. **Identity comes only from the session.** Every API handler calls `requireSession()` ([lib/auth.ts](lib/auth.ts)), which verifies the JWT from the httpOnly cookie. `userId` is never read from the request body, params, or query. Unknown body fields such as `userId` are stripped by Zod.
2. **Every query is scoped.** Services always filter by both the record id and the owner, e.g. `Todo.findOne({ _id, userId })`, `findOneAndUpdate({ _id, userId }, …)`, `findOneAndDelete({ _id, userId })`. They never use `findById` alone. See [services/todo-service.ts](services/todo-service.ts) and [services/note-service.ts](services/note-service.ts).
3. **404, not 403.** A record owned by someone else, a record that doesn't exist, and a malformed id all return the same `404 { message, code: "NOT_FOUND" }`. The API never confirms that another user's record exists.
4. **Ids are validated** as 24-character hex ObjectIds before any query.
5. **Defence in depth.** [proxy.ts](proxy.ts) redirects signed-out users away from `/todos` and `/notes`, but API route handlers verify the session themselves and never rely on the proxy. Sign-in and sign-out clear the client-side query cache so one account's data can't flash up for another.

### Proving it

`npm run test:isolation` runs [scripts/tenant-isolation.mts](scripts/tenant-isolation.mts). It registers two throwaway users, then checks that user B gets `404` when trying to **GET, PATCH, and DELETE** user A's to-do and note. It also checks that A's items never appear in B's lists, that requests without a session get `401`, and that A's data is unchanged afterwards.

```bash
npm run dev                                               # terminal 1
npm run test:isolation                                    # terminal 2
BASE_URL=https://personal-organizer-nu-eosin.vercel.app npm run test:isolation   # or against the live app
```

The script deletes the to-dos and notes it creates. The two `iso_a_*` / `iso_b_*` test users stay in the database.

## Username availability (bloom filter)

Usernames are unique, so the sign-up form checks availability as you type (debounced, 400 ms) via `GET /api/auth/username-check?username=…`.

- A [bloom filter](lib/bloom.ts) (sized for 100,000 names at a 1% false-positive rate, about 117 KB) is seeded from existing usernames on first use and updated on each registration.
- **"Definitely not in the filter"** means the name is available, with no database query.
- **"Probably taken"** is always **confirmed with a real database lookup** before the user is told the name is taken, because bloom filters can give false positives but never false negatives.
- The **unique index** on `username` is the final guard against two people registering the same name at once. Registration returns `409` in that case.
- On serverless platforms each instance has its own in-memory filter, so the database is always the source of truth.

## API

All responses are JSON. Success responses look like `{ data: … }`. Errors look like `{ message, code }`, with an optional `fields` object of per-field messages for validation and conflict errors.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | – | `{ username, email, password }` → `201 { data: { user } }`, sets the session cookie |
| POST | `/api/auth/login` | – | `{ email, password }` → `{ data: { user } }`. Any failure returns `401 "Invalid credentials"` |
| POST | `/api/auth/logout` | – | Clears the session cookie |
| GET | `/api/auth/me` | ✓ | Current user (never includes the password hash) |
| GET | `/api/auth/username-check?username=` | – | `{ data: { username, available } }` |
| GET / POST | `/api/todos` | ✓ | List your to-dos (newest first) / create one |
| GET / PATCH / DELETE | `/api/todos/:id` | ✓ | Read / update / delete one of **your** to-dos |
| GET / POST | `/api/notes` | ✓ | List your notes / create one |
| GET / PATCH / DELETE | `/api/notes/:id` | ✓ | Read / update / delete one of **your** notes |

To-do fields: `title` (required, ≤120), `description` (≤1000), `dueDate` (`YYYY-MM-DD`), `completed`. In `PATCH`, omitted fields stay unchanged and `null` clears `description` or `dueDate`. Note fields: `title` (required, ≤120) and `content` (required, ≤10,000).

Status codes: `400` for validation errors or invalid JSON, `401` when there is no valid session or credentials are wrong, `404` when a record is not found or not yours, `409` when a username or email is taken, and `500` for unexpected errors (logged server-side).

## Project structure

```
app/
  (auth)/login, (auth)/register     sign-in pages
  (dashboard)/todos, /notes         protected pages (layout checks the session)
  api/…                             route handlers: validate → call service → respond
components/
  ui/                               shadcn components
  auth/ todos/ notes/ shared/       feature and shared components
hooks/                              React Query hooks (use-auth, use-todos, use-notes)
lib/                                db, auth (JWT/cookies), api-error, api-client, bloom, validation
models/                             Mongoose models (User, Todo, Note)
schemas/                            Zod schemas shared by client and server
services/                           business logic, all queries scoped by userId
proxy.ts                            redirects signed-out users (Next.js 16's name for middleware)
scripts/tenant-isolation.mts        isolation check
```

## Deploying to Vercel with MongoDB Atlas

1. **Atlas:** in *Network Access*, allow `0.0.0.0/0` (Vercel has no fixed IPs). Create a database user and copy the connection string.
2. **Vercel:** import the repo. In *Settings → Environment Variables*, set `MONGODB_URI` and `JWT_SECRET`. Do **not** set `MONGODB_DNS_SERVERS`.
3. Before deploying, run `npm run build` locally to catch build errors.
4. After deploying, run `BASE_URL=https://<your-app>.vercel.app npm run test:isolation`.

Serverless notes: the Mongoose connection is cached on `globalThis` so warm invocations reuse it. Logging uses plain `console`, with no logger transports.

## Security notes

- Passwords are hashed with bcrypt (cost 12). Passwords over 72 bytes are rejected because bcrypt would silently ignore the extra bytes.
- A failed login takes the same time whether or not the email exists (a dummy hash is compared), so response timing doesn't reveal which emails are registered.
- The session cookie is `httpOnly`, `sameSite=lax`, `secure` in production, and expires after 7 days. It holds only the user id.
- The `?from=` redirect after sign-in only accepts same-site paths, which prevents open redirects.
- **Not included (possible next steps):** rate limiting on login and sign-up, email verification, password reset, and pagination for very long lists.
