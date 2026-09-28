import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "To-dos" };

export default function TodosPage() {
  return <PageHeader title="To-dos" description="Plan it, do it, tick it off." />;
}
