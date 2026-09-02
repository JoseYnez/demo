import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChild,
} from "@angular/core";

import type {
  AppNotification,
  NotificationVariant,
} from "../../../models/notification.model";

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

const FAMILIA: Record<NotificationVariant, string> = {
  neutral: "Aviso",
  success: "Correcto",
  warning: "Atención",
  danger: "Error",
  info: "Información",
};

@Component({
  selector: "app-notification-panel",
  templateUrl: "./notification-panel.html",
  styleUrl: "./notification-panel.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationPanel {
  readonly items = input<readonly AppNotification[]>([]);

  readonly dismissed = output<string>();
  readonly cleared = output<void>();

  private readonly caja = viewChild.required<ElementRef<HTMLElement>>("caja");

  protected readonly vacio = computed(() => this.items().length === 0);

  focus(): void {
    this.caja().nativeElement.focus();
  }

  protected estado(aviso: AppNotification): string {
    const familia = FAMILIA[aviso.variant];
    return aviso.read ? `${familia}:` : `${familia}, sin leer:`;
  }

  protected hace(createdAt: number): string {
    const transcurrido = Math.max(0, Date.now() - createdAt);
    if (transcurrido < MINUTO) return "ahora";
    if (transcurrido < HORA)
      return `hace ${Math.floor(transcurrido / MINUTO)} min`;
    if (transcurrido < DIA) return `hace ${Math.floor(transcurrido / HORA)} h`;
    return `hace ${Math.floor(transcurrido / DIA)} d`;
  }
}
