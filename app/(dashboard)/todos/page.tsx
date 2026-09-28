import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { NewTodoButton, TodoList } from "@/components/todos/todo-list";

export const metadata: Metadata = { title: "To-dos" };

export default function TodosPage() {
  return (
    <>
      <PageHeader
        title="To-dos"
        description="Plan it, do it, tick it off."
        action={<NewTodoButton />}
      />
      <TodoList />
    </>
  );
}
