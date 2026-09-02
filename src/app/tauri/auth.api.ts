import { invoke } from "@tauri-apps/api/core";

import type { Credentials, Session } from "../models/session.model";

export const authApi = {
  login: async ({ username, password }: Credentials): Promise<Session> => {
    try {
      return await invoke<Session>("login", { username, password });
    } catch (e) {
      throw new Error(`authApi.login: ${e}`, { cause: e });
    }
  },
};
