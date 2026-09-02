import { Service, signal } from "@angular/core";

import { windowApi } from "../../tauri";

@Service()
export class FullscreenService {
  readonly #active = signal(false);
  #restaurarMaximizada = false;
  #enTransicion = false;

  readonly active = this.#active.asReadonly();

  toggle(): void {
    this.set(!this.#active());
  }

  set(active: boolean): void {
    this.#active.set(active);
    void this.aplicar(active);
  }

  async sync(): Promise<void> {
    if (this.#enTransicion) {
      return;
    }
    const real = await windowApi.isFullscreen();
    if (this.#enTransicion) {
      return;
    }
    this.#active.set(real);
  }

  private async aplicar(active: boolean): Promise<void> {
    this.#enTransicion = true;
    try {
      if (active) {
        this.#restaurarMaximizada = await windowApi.isMaximized();
        if (this.#restaurarMaximizada) {
          await windowApi.unmaximize();
        }
        await windowApi.setFullscreen(true);
      } else {
        await windowApi.setFullscreen(false);
        if (this.#restaurarMaximizada) {
          await windowApi.maximize();
        }
        this.#restaurarMaximizada = false;
      }
    } finally {
      this.#enTransicion = false;
    }
  }
}
