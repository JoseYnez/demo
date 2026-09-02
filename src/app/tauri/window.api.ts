import { isTauri } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow, type Theme } from "@tauri-apps/api/window";

const enTauri = isTauri();

export const windowApi = {
  enTauri,

  minimize: async (): Promise<void> => {
    if (!enTauri) return;
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      throw new Error(`windowApi.minimize: ${e}`);
    }
  },

  toggleMaximize: async (): Promise<void> => {
    if (!enTauri) return;
    try {
      await getCurrentWindow().toggleMaximize();
    } catch (e) {
      throw new Error(`windowApi.toggleMaximize: ${e}`);
    }
  },

  close: async (): Promise<void> => {
    if (!enTauri) return;
    try {
      await getCurrentWindow().close();
    } catch (e) {
      throw new Error(`windowApi.close: ${e}`);
    }
  },

  isMaximized: async (): Promise<boolean> => {
    if (!enTauri) return false;
    try {
      return await getCurrentWindow().isMaximized();
    } catch (e) {
      throw new Error(`windowApi.isMaximized: ${e}`);
    }
  },

  maximize: async (): Promise<void> => {
    if (!enTauri) return;
    try {
      await getCurrentWindow().maximize();
    } catch (e) {
      throw new Error(`windowApi.maximize: ${e}`);
    }
  },

  unmaximize: async (): Promise<void> => {
    if (!enTauri) return;
    try {
      await getCurrentWindow().unmaximize();
    } catch (e) {
      throw new Error(`windowApi.unmaximize: ${e}`);
    }
  },
  setFullscreen: async (fullscreen: boolean): Promise<void> => {
    if (!enTauri) return;
    try {
      await getCurrentWindow().setFullscreen(fullscreen);
    } catch (e) {
      throw new Error(`windowApi.setFullscreen: ${e}`);
    }
  },

  isFullscreen: async (): Promise<boolean> => {
    if (!enTauri) return false;
    try {
      return await getCurrentWindow().isFullscreen();
    } catch (e) {
      throw new Error(`windowApi.isFullscreen: ${e}`);
    }
  },
  setTheme: async (theme: Theme): Promise<void> => {
    if (!enTauri) return;
    try {
      await getCurrentWindow().setTheme(theme);
    } catch (e) {
      throw new Error(`windowApi.setTheme: ${e}`);
    }
  },

  onResized: async (handler: () => void): Promise<UnlistenFn> => {
    if (!enTauri) return () => {};
    try {
      return await getCurrentWindow().onResized(() => handler());
    } catch (e) {
      throw new Error(`windowApi.onResized: ${e}`);
    }
  },
};
