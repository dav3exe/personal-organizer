<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ROLE
You are my senior full-stack pair-programmer. Build exactly to the conventions below. If something is ambiguous, pick the option that matches these conventions and tell me what you chose. Don't ask me a long list of questions.

# PROJECT: Personal Organizer
A multi-tenant to-do and notes app.
- Users register and sign in to their own account.
- Each user manages their own to-do items (add, edit, complete, delete) and their own notes (add, edit, delete).
- Feature of choice: MULTI-TENANCY. Every user's data is fully isolated. A user can never read, edit, or delete another user's data, even by guessing IDs.
- Must run locally first, then deploy live on Vercel with MongoDB Atlas.

# STACK (fixed, do not substitute)
- Next.js 16 (latest) with the **App Router only**. Everything (UI and API) lives in one project.
- **Do NOT use the Pages Router**: no `pages/` directory, no `pages/api`, no `getServerSideProps` or `getStaticProps`. Backend endpoints are Route Handlers (`app/api/**/route.ts`).
- TypeScript in strict mode. No `any`.
- MongoDB with Mongoose.
- Tailwind CSS and shadcn/ui. Toasts use shadcn's Sonner component (the old shadcn `toast` is deprecated).
- Forms: React Hook Form with Zod (`@hookform/resolvers/zod`).
- Client data fetching and mutations: TanStack React Query calling my own route handlers.
- Auth: email and password, passwords hashed with bcrypt, session as a JWT in an **httpOnly cookie**. Use `jose` (not `jsonwebtoken`) for signing and verifying.
- Validation: Zod on every request body and query.

# NEXT.JS 16 NOTES
- `middleware.ts` is deprecated in Next.js 16 and renamed to **`proxy.ts`** (exported function `proxy`). Use `proxy.ts`. It runs on the Node.js runtime; the `runtime` config option is not allowed in it.
- Keep `proxy.ts` light: only read the cookie and verify the JWT. No DB access, no shared globals.
- `next lint` was removed. Lint with the ESLint CLI via `npm run lint`.

# FOLDER STRUCTURE (root-level, no `src/`)
```
app/
  (auth)/
    login/page.tsx
    register/page.tsx
  (dashboard)/
    layout.tsx              # protected shell, navbar, logout
    todos/page.tsx
    notes/page.tsx
  api/
    auth/register/route.ts
    auth/login/route.ts
    auth/logout/route.ts
    auth/me/route.ts
    auth/username-check/route.ts
    todos/route.ts          # GET (list), POST
    todos/[id]/route.ts     # GET, PATCH, DELETE
    notes/route.ts
    notes/[id]/route.ts
  layout.tsx
  page.tsx
  globals.css
components/
  ui/                       # shadcn components only
  todos/                    # e.g. todo-card.tsx, todo-form.tsx, todo-list.tsx
  notes/                    # e.g. note-card.tsx, note-form.tsx
  shared/                   # navbar, empty-state, loaders, providers
hooks/                      # use-todos.ts, use-notes.ts, use-auth.ts (React Query hooks)
lib/
  db.ts                     # cached Mongoose connection (see rules)
  auth.ts                   # sign/verify JWT, cookie helpers, getSession()
  api-error.ts              # AppError class and error-to-response helper
  bloom.ts                  # bloom filter for username check
  utils.ts
models/                     # user.ts, todo.ts, note.ts (Mongoose)
schemas/                    # zod schemas: auth.ts, todo.ts, note.ts (shared by client and server)
services/                   # server-side logic used by route handlers: todo-service.ts, note-service.ts, auth-service.ts
types/                      # shared TS types
proxy.ts                    # protects (dashboard) routes, redirects unauthenticated users to /login
.env.example
```
Conventions:
- File names are kebab-case. Components are PascalCase exports. Hooks are `useSomething` exported from `use-something.ts`.
- Route handlers stay thin: parse and validate, call a service, return a response. Business logic lives in `services/`.
- Server Components by default. Add `"use client"` only where state, effects, or event handlers are needed.

# DATA MODEL
- User: `username` (unique, lowercase), `email` (unique, lowercase), `passwordHash` (`select: false`), timestamps.
- Todo: `userId` (ObjectId, ref User, required, indexed), `title`, `description?`, `completed` (default false), `dueDate?`, timestamps.
- Note: `userId` (required, indexed), `title`, `content`, timestamps.
- Compound index `{ userId: 1, createdAt: -1 }` on todos and notes.

# MULTI-TENANCY RULES (most important part, reviewers will check this)
1. `userId` ALWAYS comes from the verified session (JWT), NEVER from the request body, params, or query.
2. Every read, update, and delete query includes `userId` in its filter, for example `Todo.findOne({ _id: id, userId })`. Use `findOneAndUpdate` and `findOneAndDelete` with `{ _id, userId }`. Never use `findById` alone for todos or notes.
3. If a document isn't found for that user, return **404** (not 403), so IDs of other users' data are never confirmed to exist.
4. Validate that `id` params are valid ObjectIds before querying.
5. Add a test or script proving user A cannot GET, PATCH, or DELETE user B's todo or note.

# AUTH RULES
- Register: validate, check that email and username are free, hash with bcrypt, create the user, set the cookie.
- Login: generic error message on failure ("Invalid credentials"), never reveal which field was wrong.
- Cookie: `httpOnly`, `sameSite: "lax"`, `secure` in production, sensible expiry.
- `/api/auth/me` returns the current user (never the hash). `/api/auth/logout` clears the cookie.
- `proxy.ts` protects dashboard pages. Route handlers ALSO verify the session themselves and don't rely on the proxy alone.

# USERNAME AVAILABILITY (bloom filter)
Signup has unique usernames, so use a bloom filter for the "is this username taken?" check:
- `lib/bloom.ts` holds an in-memory bloom filter, seeded from existing usernames on first use and updated on each successful registration.
- "Definitely not taken" means the username is available. "Probably taken" must be CONFIRMED with a real DB lookup before telling the user it's taken.
- The unique index on `username` in MongoDB is the final guard against race conditions.
- Expose it as `GET /api/auth/username-check?username=...`, debounced on the client.
- Note in a comment that in serverless each instance has its own filter, so the DB lookup is the source of truth.

# BACKEND CODE RULES
- Every route handler wraps its logic in try/catch and returns errors through the shared helper in `lib/api-error.ts`. Consistent error shape: `{ message: string, code: string }`, with correct status codes (400, 401, 404, 409, 500).
- Consistent success shape: `{ data: ... }`.
- MongoDB connection: cache the Mongoose connection on `globalThis` so it isn't recreated on every serverless invocation or hot reload. Fail with a clear error if `MONGODB_URI` is missing.
- Use plain `console.error` for logging. Do NOT use `pino-pretty` or any logger transport that breaks on Vercel serverless.
- All secrets come from environment variables (`MONGODB_URI`, `JWT_SECRET`). Provide `.env.example`. Never hardcode secrets.
- Never return password hashes. Never trust client input.

# FRONTEND CODE RULES
- Forms use React Hook Form and Zod. Show field-level errors.
- Query hooks live in `hooks/`. Use stable query keys (for example `["todos"]`, `["notes"]`) and invalidate them after mutations.
- Todo cards show the title, description, due date, a complete toggle, and Edit and Delete buttons. Notes are shown as cards with Edit and Delete.
- Include loading states, empty states, error states, and toast feedback on actions.
- Responsive (mobile first). Clean, professional UI with shadcn/ui.
- Dark and light mode support.
- Handle the `"use client"` boundary carefully. Don't import server-only code (models, `lib/db.ts`) into client components.

# HOW TO WORK WITH ME
1. Work one milestone at a time. After each, stop and let me review before continuing.
   - M1: Project setup, Tailwind, shadcn, DB connection, folder structure, `.env.example`
   - M2: Models, Zod schemas, auth services and routes, `lib/auth.ts`, `proxy.ts`
   - M3: Todo API, scoped per user
   - M4: Notes API, scoped per user
   - M5: Auth pages and protected dashboard shell
   - M6: Todos and Notes UI with React Query
   - M7: Bloom-filter username check, tenant-isolation test, README, cleanup
2. **VERIFY BEFORE HANDING OVER.** Before telling me a milestone is done, run typecheck (`npx tsc --noEmit`), lint (`npm run lint`), and `npm run build`, fix every error, and tell me the results. Never give me unverified changes.
3. When you give me code, give complete files with their full paths, not fragments. Say how to run and test it, in short steps.
4. Keep explanations short. Explain a decision only when it isn't obvious.
5. If you deviate from any rule above, tell me and say why.
