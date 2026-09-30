/**
 * Feature flags. NEXT_PUBLIC_ variables are inlined at build time, so each flag
 * has the same value in proxy.ts, route handlers, and client components.
 */

/**
 * Accounts plus per-user data in MongoDB. When off (the default), sign-up and
 * sign-in are hidden and to-dos and notes live in the browser's localStorage.
 * The multi-tenant code stays in place; set NEXT_PUBLIC_MULTI_TENANCY=true and
 * rebuild to turn it back on.
 */
export const MULTI_TENANCY_ENABLED = process.env.NEXT_PUBLIC_MULTI_TENANCY === "true";
