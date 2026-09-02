import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

import { APP_VERSION, GIT_COMMIT } from "./core/build-info";
import { KeyboardService } from "./core/services/keyboard";
import { NotificationsService } from "./core/services/notifications";
import { ThemeService } from "./core/services/theme";
import { windowApi } from "./tauri";

const TOPE_DEL_CONTADOR = 9;

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
  private readonly notificaciones = inject(NotificationsService);

  protected readonly themes = inject(ThemeService);

  protected readonly identidadDelBuild = `demo v${APP_VERSION} · ${GIT_COMMIT}`;

  protected readonly enTauri = windowApi.enTauri;
  protected readonly maximizada = signal(false);

  protected readonly pendientes = this.notificaciones.unread;
  protected readonly contador = computed(() => {
    const pendientes = this.pendientes();
    return pendientes > TOPE_DEL_CONTADOR ? `${TOPE_DEL_CONTADOR}+` : `${pendientes}`;
  });
  protected readonly etiquetaNotificaciones = computed(() => {
    const pendientes = this.pendientes();
    if (pendientes === 0) {
      return "Notificaciones: ninguna sin leer";
    }
    return `Notificaciones: ${pendientes} sin leer`;
  });

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

  protected abrirNotificaciones(): void {
    this.notificaciones.markAllAsRead();
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
