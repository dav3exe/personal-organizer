import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { requireAccountsEnabled } from "@/lib/auth";
import { parseWith } from "@/lib/validation";
import { usernameCheckQuerySchema } from "@/schemas/auth";
import { isUsernameAvailable } from "@/services/auth-service";

export async function GET(request: NextRequest) {
  try {
    requireAccountsEnabled();
    const { username } = parseWith(
      usernameCheckQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const available = await isUsernameAvailable(username);
    return ok({ username, available });
  } catch (error) {
    return handleApiError(error);
  }
}
