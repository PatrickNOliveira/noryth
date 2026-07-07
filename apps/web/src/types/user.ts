/** Public user shape returned by the API (never includes the password hash). */
export interface User {
  id: string;
  name: string;
  email: string;
}
