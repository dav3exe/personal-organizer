import { noteCollection } from "@/lib/data/notes";
import { todoCollection } from "@/lib/data/todos";
import { addDaysISODate } from "@/lib/date";
import type { CreateNoteInput } from "@/schemas/note";
import type { CreateTodoInput } from "@/schemas/todo";

// Sample data shows every state the UI has: open, overdue, due today, due
// later, no due date, completed, and a to-do and a note in the trash.
// Lists are in display order (newest first).

type SampleTodo = CreateTodoInput & { completed?: boolean; trashed?: boolean };
type SampleNote = CreateNoteInput & { trashed?: boolean };

function sampleTodos(): SampleTodo[] {
  return [
    {
      title: "Review the trash feature PR",
      description: "Check restore and delete-forever on mobile and desktop.",
      dueDate: addDaysISODate(0),
    },
    { title: "Book a dentist appointment", dueDate: addDaysISODate(-2) },
    {
      title: "Weekend grocery run",
      description: "Oats, eggs, spinach, coffee beans, olive oil.",
      dueDate: addDaysISODate(2),
    },
    { title: "Prepare slides for Friday's stand-up", dueDate: addDaysISODate(4) },
    {
      title: "Finish the TypeScript generics tutorial",
      description: "Chapters 4 and 5, then redo the exercises without notes.",
    },
    { title: "Set up the MongoDB Atlas cluster", completed: true },
    { title: "Deploy the app to Vercel", dueDate: addDaysISODate(-1), completed: true },
    { title: "Build a browser extension (old idea)", trashed: true },
  ];
}

const SAMPLE_NOTES: SampleNote[] = [
  {
    title: "Sprint planning notes",
    content:
      "Goals for this sprint:\n- Ship soft delete and the trash page\n- Add sample data for reviewers\n- Update the README\n\nRisks: localStorage limits on very large notes.",
  },
  {
    title: "Reading list",
    content: "1. Refactoring UI\n2. The Pragmatic Programmer\n3. Designing Data-Intensive Applications",
  },
  {
    title: "Quick tomato pasta",
    content:
      "Fry garlic in olive oil, add a tin of chopped tomatoes and a pinch of chilli. Simmer 10 minutes, toss with pasta and basil.",
  },
  {
    title: "Gift ideas",
    content: "Mum: a good pan. Sam: board game. Alex: concert tickets.",
  },
  {
    title: "Old shopping list",
    content: "Bread, milk, batteries.",
    trashed: true,
  },
];

/**
 * Adds the sample to-dos and notes to whichever store is active. Created
 * oldest first so each list ends up in display order.
 */
export async function loadSampleData(): Promise<void> {
  for (const { completed, trashed, ...input } of sampleTodos().reverse()) {
    const todo = await todoCollection.create(input);
    if (completed) await todoCollection.update(todo.id, { completed: true });
    if (trashed) await todoCollection.trash(todo.id);
  }
  for (const { trashed, ...input } of [...SAMPLE_NOTES].reverse()) {
    const note = await noteCollection.create(input);
    if (trashed) await noteCollection.trash(note.id);
  }
}

/** Permanently removes every to-do and note, including the trash. */
export async function clearAllData(): Promise<void> {
  await Promise.all([todoCollection.clear(), noteCollection.clear()]);
}
