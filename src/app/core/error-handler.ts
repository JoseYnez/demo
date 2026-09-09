import { ErrorHandler, Injectable, Injector, inject } from "@angular/core";

import { NotificationsService } from "./services/notifications";

const SIN_AVISO = "notificationApi.send";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);
  #avisando = false;

  handleError(error: unknown): void {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error("[GlobalError]", error);

    if (this.#avisando || mensaje.startsWith(SIN_AVISO)) {
      return;
    }

    this.#avisando = true;
    try {
      this.injector.get(NotificationsService).push({
        variant: "danger",
        title: "Algo ha fallado",
        detail: mensaje,
      });
    } finally {
      this.#avisando = false;
    }
  }
}
