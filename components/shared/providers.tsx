"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { ApiClientError } from "@/lib/api-client";
import { LOCAL_STORAGE_PREFIX } from "@/lib/data/local-collection";
import { MULTI_TENANCY_ENABLED } from "@/lib/features";

// One QueryClient per tab, so one flag per tab is enough.
let redirectingToLogin = false;

function isUnauthorized(error: unknown) {
  return error instanceof ApiClientError && error.code === "UNAUTHORIZED";
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  // One QueryClient per browser session, not per render.
  const [queryClient] = useState(() => {
    // Session expired or account gone: clear the cookie first (otherwise
    // proxy.ts would bounce the stale cookie back), drop cached data, go to /login.
    const onError = (error: unknown) => {
      if (!isUnauthorized(error) || redirectingToLogin) return;
      redirectingToLogin = true;
      void fetch("/api/auth/logout", { method: "POST" }).finally(() => {
        client.clear();
        router.replace("/login");
        router.refresh();
        redirectingToLogin = false;
      });
    };

    const client: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
          // Don't retry 4xx responses; retry a server/network failure once.
          retry: (failureCount, error) =>
            !(error instanceof ApiClientError && error.status >= 400 && error.status < 500) &&
            failureCount < 1,
        },
      },
    });
    return client;
  });

  // Local mode: another tab changed our data (the `storage` event only fires in
  // other tabs), so refetch. A null key means localStorage was cleared.
  useEffect(() => {
    if (MULTI_TENANCY_ENABLED) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(LOCAL_STORAGE_PREFIX)) {
        void queryClient.invalidateQueries();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
