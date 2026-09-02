import { invoke } from "@tauri-apps/api/core";

import type { Contact, ContactDraft } from "../models/contact.model";

export const contactApi = {
  list: async (): Promise<Contact[]> => {
    try {
      return await invoke<Contact[]>("list_contacts");
    } catch (e) {
      throw new Error(`contactApi.list: ${e}`, { cause: e });
    }
  },
  create: async (draft: ContactDraft): Promise<Contact> => {
    try {
      return await invoke<Contact>("create_contact", { draft });
    } catch (e) {
      throw new Error(`contactApi.create: ${e}`, { cause: e });
    }
  },
  update: async (id: number, draft: ContactDraft): Promise<Contact> => {
    try {
      return await invoke<Contact>("update_contact", { id, draft });
    } catch (e) {
      throw new Error(`contactApi.update: ${e}`, { cause: e });
    }
  },
  remove: async (id: number): Promise<number> => {
    try {
      return await invoke<number>("delete_contact", { id });
    } catch (e) {
      throw new Error(`contactApi.remove: ${e}`, { cause: e });
    }
  },
};
