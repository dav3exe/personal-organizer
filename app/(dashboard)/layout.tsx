import { redirect } from "next/navigation";

import { Navbar } from "@/components/shared/navbar";
import { getSession } from "@/lib/auth";
import { MULTI_TENANCY_ENABLED } from "@/lib/features";

// proxy.ts already redirects signed-out users; this is the server-side backstop.
// With multi-tenancy off, data lives in the browser and there's no session to check.
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  if (MULTI_TENANCY_ENABLED && !(await getSession())) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
