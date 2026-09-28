import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return ok(null);
  } catch (error) {
    return handleApiError(error);
  }
}
