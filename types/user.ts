/** User as returned by the API. Never includes the password hash. */
export type PublicUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
};
