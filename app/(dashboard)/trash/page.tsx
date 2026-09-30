import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyTrashButton, TrashList } from "@/components/trash/trash-list";

export const metadata: Metadata = { title: "Trash" };

export default function TrashPage() {
  return (
    <>
      <PageHeader
        title="Trash"
        description="Restore deleted items, or delete them for good."
        action={<EmptyTrashButton />}
      />
      <TrashList />
    </>
  );
}
