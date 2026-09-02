export type ContactRole = "admin" | "editor" | "viewer";

export interface Contact {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: ContactRole;
  readonly notes: string;
  readonly createdAt: number;
}

export interface ContactDraft {
  name: string;
  email: string;
  role: string;
  notes: string;
}
