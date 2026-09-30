/** Todo as returned by the API. */
export type Todo = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  /** Calendar date in YYYY-MM-DD format. */
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  /** When it was moved to the trash; null while active. */
  deletedAt: string | null;
};
