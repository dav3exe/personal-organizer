import { redirect } from "next/navigation";

import { Navbar } from "@/components/shared/navbar";
import { getSession } from "@/lib/auth";

// proxy.ts already redirects signed-out users; this is the server-side backstop.
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
