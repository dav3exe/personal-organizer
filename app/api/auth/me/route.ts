import { errors, handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { clearSessionCookie, requireSession } from "@/lib/auth";
import { getUserById } from "@/services/auth-service";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const user = await getUserById(userId);
    if (!user) {
      // Valid token for a deleted account: drop the stale cookie.
      await clearSessionCookie();
      throw errors.unauthorized();
    }
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
