import { invoke, isTauri } from "@tauri-apps/api/core";

const enTauri = isTauri();

export interface SystemNotification {
  readonly title: string;
  readonly body?: string;
}

export const notificationApi = {
  enTauri,

  send: async (notification: SystemNotification): Promise<void> => {
    if (!enTauri) return;
    try {
      await invoke("notify", {
        title: notification.title,
        body: notification.body,
      });
    } catch (e) {
      throw new Error(`notificationApi.send: ${e}`);
    }
  },
};
