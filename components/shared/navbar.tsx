"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Loader2, LogOut, NotebookPen, Trash2 } from "lucide-react";

import { SampleDataControls } from "@/components/shared/sample-data-controls";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataCounts } from "@/hooks/use-app-data";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { MULTI_TENANCY_ENABLED } from "@/lib/features";

const links = [
  { href: "/todos", label: "To-dos", icon: CheckSquare },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/trash", label: "Trash", icon: Trash2 },
];

/** Username and sign-out. Only rendered when accounts are on. */
function AccountMenu() {
  const { data: user, isPending } = useCurrentUser();
  const logout = useLogout();

  return (
    <>
      {isPending ? (
        <Skeleton className="h-4 w-20" />
      ) : (
        user && (
          <span className="max-w-32 truncate text-sm text-muted-foreground" title={user.email}>
            {user.username}
          </span>
        )
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Sign out"
        title="Sign out"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {logout.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
      </Button>
    </>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { trash } = useDataCounts();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/todos" className="font-semibold tracking-tight">
          Personal Organizer
        </Link>

        <nav aria-label="Main" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            const count = href === "/trash" && trash > 0 ? trash : null;
            return (
              <Button
                key={href}
                asChild
                variant={active ? "secondary" : "ghost"}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Link href={href} aria-current={active ? "page" : undefined}>
                  <Icon aria-hidden />
                  {label}
                  {count !== null && (
                    <span
                      className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground"
                      aria-label={`${count} in trash`}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SampleDataControls />
          <ThemeToggle />
          {MULTI_TENANCY_ENABLED && <AccountMenu />}
        </div>
      </div>
    </header>
  );
}
