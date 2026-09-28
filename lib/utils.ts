export { cn } from "cn"

/**
 * Returns `path` only if it is a same-site relative path, otherwise `fallback`.
 * Prevents open redirects through `?from=https://evil.example`.
 */
export function safeRedirectPath(path: string | null | undefined, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback
  }
  return path
}
