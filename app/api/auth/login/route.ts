import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { setSessionCookie, signSessionToken } from "@/lib/auth";
import { parseJsonBody } from "@/lib/validation";
import { loginSchema } from "@/schemas/auth";
import { loginUser } from "@/services/auth-service";

export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, loginSchema);
    const user = await loginUser(input);
    await setSessionCookie(await signSessionToken({ userId: user.id }));
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
