"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch, getErrorMessage } from "@/lib/api-client";
import type { LoginInput, RegisterInput } from "@/schemas/auth";
import type { PublicUser } from "@/types/user";

export const authKeys = {
  me: ["me"] as const,
};

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
