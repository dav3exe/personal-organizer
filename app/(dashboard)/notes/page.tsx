import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Notes" };

export default function NotesPage() {
  return <PageHeader title="Notes" description="Ideas, lists, and anything worth keeping." />;
}
