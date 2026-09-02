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
    try {
      if (!enTauri) {
        if (fullscreen) {
          await document.documentElement.requestFullscreen?.();
        } else if (document.fullscreenElement) {
          await document.exitFullscreen?.();
        }
        return;
      }
      await getCurrentWindow().setFullscreen(fullscreen);
    } catch (e) {
      throw new Error(`windowApi.setFullscreen: ${e}`);
    }
  },

  isFullscreen: async (): Promise<boolean> => {
    try {
      if (!enTauri) {
        return !!document.fullscreenElement;
      }
      return await getCurrentWindow().isFullscreen();
    } catch (e) {
      throw new Error(`windowApi.isFullscreen: ${e}`);
    }
  },

  isFocused: async (): Promise<boolean> => {
    if (!enTauri) return document.hasFocus();
    try {
      return await getCurrentWindow().isFocused();
    } catch (e) {
      throw new Error(`windowApi.isFocused: ${e}`);
    }
  },

  onFocusChanged: async (
    handler: (focused: boolean) => void,
  ): Promise<UnlistenFn> => {
    if (!enTauri) {
      const alEnfocar = () => handler(true);
      const alPerderlo = () => handler(false);
      window.addEventListener("focus", alEnfocar);
      window.addEventListener("blur", alPerderlo);
      return () => {
        window.removeEventListener("focus", alEnfocar);
        window.removeEventListener("blur", alPerderlo);
      };
    }
    try {
      return await getCurrentWindow().onFocusChanged(({ payload }) =>
        handler(payload),
      );
    } catch (e) {
      throw new Error(`windowApi.onFocusChanged: ${e}`);
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

  onWindowChanged: async (handler: () => void): Promise<UnlistenFn> => {
    if (!enTauri) {
      const escuchar = () => handler();
      document.addEventListener("fullscreenchange", escuchar);
      return () => document.removeEventListener("fullscreenchange", escuchar);
    }
    try {
      return await getCurrentWindow().onResized(() => handler());
    } catch (e) {
      throw new Error(`windowApi.onWindowChanged: ${e}`);
    }
  },
};
