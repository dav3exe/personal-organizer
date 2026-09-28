"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { apiFetch, getErrorMessage } from "@/lib/api-client";
import { usernameSchema, type LoginInput, type RegisterInput } from "@/schemas/auth";
import type { PublicUser } from "@/types/user";

export const authKeys = {
  me: ["me"] as const,
  usernameCheck: (username: string) => ["username-check", username] as const,
};

const USERNAME_CHECK_DEBOUNCE_MS = 400;

/**
 * Debounced "is this username taken?" check against the bloom-filter-backed API.
 * Only runs for usernames that already pass client validation.
 */
export function useUsernameAvailability(rawUsername: string) {
  const debounced = useDebouncedValue(rawUsername, USERNAME_CHECK_DEBOUNCE_MS);
  const parsed = usernameSchema.safeParse(debounced);
  const username = parsed.success ? parsed.data : "";

  const query = useQuery({
    queryKey: authKeys.usernameCheck(username),
    queryFn: async () =>
      (
        await apiFetch<{ username: string; available: boolean }>(
          `/api/auth/username-check?username=${encodeURIComponent(username)}`
        )
      ).available,
    enabled: username !== "",
    staleTime: 60_000,
  });

  const settled = rawUsername === debounced;
  return {
    /** Still typing, or waiting on the server. */
    isChecking: username !== "" && (!settled || query.isFetching),
    /** null until there's an answer for the current input. */
    available: settled && username !== "" && query.data !== undefined ? query.data : null,
  };
}

type UserResponse = { user: PublicUser };

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => (await apiFetch<UserResponse>("/api/auth/me")).user,
    staleTime: 5 * 60_000,
  });
}

/** After sign-in, drop any cached data from a previous account, then navigate. */
function useEnterApp() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return (user: PublicUser, redirectTo: string) => {
    queryClient.clear();
    queryClient.setQueryData(authKeys.me, user);
    router.replace(redirectTo);
    router.refresh();
  };
}

export function useLogin(redirectTo: string) {
  const enterApp = useEnterApp();
  return useMutation({
    mutationFn: async (input: LoginInput) =>
      (await apiFetch<UserResponse>("/api/auth/login", { method: "POST", body: input })).user,
    onSuccess: (user) => {
      toast.success(`Welcome back, ${user.username}`);
      enterApp(user, redirectTo);
    },
  });
}

export function useRegister() {
  const enterApp = useEnterApp();
  return useMutation({
    mutationFn: async (input: RegisterInput) =>
      (await apiFetch<UserResponse>("/api/auth/register", { method: "POST", body: input })).user,
    onSuccess: (user) => {
      toast.success(`Welcome, ${user.username}! Your account is ready.`);
      enterApp(user, "/todos");
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<null>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
      toast.success("Signed out");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
