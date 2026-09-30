import Link from "next/link";
import { CheckSquare, HardDrive, NotebookPen, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MULTI_TENANCY_ENABLED } from "@/lib/features";

const features = [
  {
    icon: CheckSquare,
    title: "To-dos",
    description: "Add, edit, and complete tasks with due dates.",
  },
  {
    icon: NotebookPen,
    title: "Notes",
    description: "Capture ideas and keep them organised.",
  },
  {
    icon: Trash2,
    title: "Trash",
    description: "Deleted items can be restored, or removed for good.",
  },
  MULTI_TENANCY_ENABLED
    ? {
        icon: ShieldCheck,
        title: "Private by design",
        description: "Your data is visible only to your account.",
      }
    : {
        icon: HardDrive,
        title: "No sign-up",
        description: "Everything is saved in this browser.",
      },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-12 px-4 py-16 text-center sm:px-6">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Personal Organizer
        </h1>
        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
          {MULTI_TENANCY_ENABLED
            ? "Your to-dos and notes in one place, private to your account."
            : "Your to-dos and notes in one place, saved right in your browser."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {MULTI_TENANCY_ENABLED ? (
            <>
              <Button asChild size="lg">
                <Link href="/register">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg">
              <Link href="/todos">Open the app</Link>
            </Button>
          )}
        </div>
      </div>

      <ul className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, description }) => (
          <li
            key={title}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-6 text-card-foreground"
          >
            <Icon className="size-6 text-muted-foreground" aria-hidden />
            <h2 className="font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
