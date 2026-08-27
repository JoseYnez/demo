import { invoke } from "@tauri-apps/api/core";

export const greetApi = {
  greet: async (name: string): Promise<string> => {
    try {
      return await invoke<string>("greet", { name });
    } catch (e) {
      throw new Error(`greetApi.greet: ${e}`);
    }
  },
};
