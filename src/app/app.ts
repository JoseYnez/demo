import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

import { APP_VERSION, GIT_COMMIT, GIT_COMMIT_SHORT } from "./core/build-info";
import { KeyboardService } from "./core/services/keyboard";
import { ThemeService } from "./core/services/theme";
import { windowApi } from "./tauri";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly destroyRef = inject(DestroyRef);
  private readonly teclado = inject(KeyboardService);

  protected readonly themes = inject(ThemeService);

  protected readonly version = APP_VERSION;
  protected readonly commit = GIT_COMMIT_SHORT;
  protected readonly commitCompleto = GIT_COMMIT;

  protected readonly enTauri = windowApi.enTauri;
  protected readonly maximizada = signal(false);

  constructor() {
    this.bloquearNavegacionAlSoltarArchivos();
    this.seguirEstadoDeLaVentana();
    this.teclado.register(
      {
        key: "t",
        ctrl: true,
        alt: true,
        description: "Cambiar tema claro/oscuro",
      },
      () => this.themes.toggle(),
    );
  }

  protected minimizar(): void {
    void windowApi.minimize();
  }

  protected alternarMaximizado(): void {
    void windowApi.toggleMaximize();
  }

  protected cerrar(): void {
    void windowApi.close();
  }

  private seguirEstadoDeLaVentana(): void {
    if (!this.enTauri) {
      return;
    }
    const sincronizar = async () =>
      this.maximizada.set(await windowApi.isMaximized());

    void sincronizar();

    const desuscribir = windowApi.onResized(() => void sincronizar());
    this.destroyRef.onDestroy(() => void desuscribir.then((f) => f()));
  }

  private bloquearNavegacionAlSoltarArchivos(): void {
    const bloquear = (event: DragEvent) => event.preventDefault();
    document.addEventListener("dragover", bloquear);
    document.addEventListener("drop", bloquear);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener("dragover", bloquear);
      document.removeEventListener("drop", bloquear);
    });
  }
}
