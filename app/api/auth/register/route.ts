import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { setSessionCookie, signSessionToken } from "@/lib/auth";
import { parseJsonBody } from "@/lib/validation";
import { registerSchema } from "@/schemas/auth";
import { registerUser } from "@/services/auth-service";

export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, registerSchema);
    const user = await registerUser(input);
    await setSessionCookie(await signSessionToken({ userId: user.id }));
    return ok({ user }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
