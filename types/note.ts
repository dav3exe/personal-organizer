/** Note as returned by the API. */
export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  /** When it was moved to the trash; null while active. */
  deletedAt: string | null;
};
