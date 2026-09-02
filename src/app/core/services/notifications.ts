import { computed, DestroyRef, inject, Service, signal } from "@angular/core";

import type {
  AppNotification,
  NewNotification,
} from "../../models/notification.model";
import { notificationApi, windowApi } from "../../tauri";

const LIMITE_DEL_HISTORIAL = 50;
const TOASTS_A_LA_VEZ = 3;
const DURACION_POR_DEFECTO = 6000;

@Service()
export class NotificationsService {
  readonly #items = signal<readonly AppNotification[]>([]);
  readonly #visibles = signal<readonly string[]>([]);
  readonly #enfocada = signal(document.hasFocus());
  #ultimoId = 0;

  readonly items = this.#items.asReadonly();
  readonly focused = this.#enfocada.asReadonly();

  readonly unread = computed(
    () => this.#items().filter((item) => !item.read).length,
  );

  readonly toasts = computed(() => {
    const porId = new Map(this.#items().map((item) => [item.id, item]));
    return this.#visibles()
      .map((id) => porId.get(id))
      .filter((item): item is AppNotification => item !== undefined);
  });

  constructor() {
    void windowApi.isFocused().then((focused) => this.#enfocada.set(focused));

    const desuscribir = windowApi.onFocusChanged((focused) =>
      this.#enfocada.set(focused),
    );
    inject(DestroyRef).onDestroy(() => void desuscribir.then((f) => f()));
  }

  push(notification: NewNotification): string {
    const id = `n${++this.#ultimoId}`;
    const variant = notification.variant ?? "neutral";
    const aviso: AppNotification = {
      id,
      variant,
      title: notification.title,
      detail: notification.detail,
      createdAt: Date.now(),
      duration: notification.duration ?? this.duracionDe(variant),
      read: false,
    };

    this.#items.update((items) =>
      [aviso, ...items].slice(0, LIMITE_DEL_HISTORIAL),
    );
    if (notification.silent) {
      return id;
    }
    if (this.#enfocada()) {
      this.#visibles.update((ids) => [id, ...ids].slice(0, TOASTS_A_LA_VEZ));
    } else {
      void this.avisarAlSistema(aviso);
    }
    return id;
  }

  markAsRead(id: string): void {
    this.#items.update((items) =>
      items.map((item) =>
        item.id === id && !item.read ? { ...item, read: true } : item,
      ),
    );
  }

  markAllAsRead(): void {
    this.#items.update((items) =>
      items.map((item) => (item.read ? item : { ...item, read: true })),
    );
  }

  dismiss(id: string): void {
    this.#items.update((items) => items.filter((item) => item.id !== id));
    this.expireToast(id);
  }

  clear(): void {
    this.#items.set([]);
    this.clearToasts();
  }

  expireToast(id: string): void {
    this.#visibles.update((ids) => ids.filter((visible) => visible !== id));
  }

  closeToast(id: string): void {
    this.expireToast(id);
    this.markAsRead(id);
  }

  clearToasts(): void {
    this.#visibles.set([]);
  }

  private async avisarAlSistema(aviso: AppNotification): Promise<void> {
    await notificationApi.send({ title: aviso.title, body: aviso.detail });
  }

  private duracionDe(variant: AppNotification["variant"]): number {
    return variant === "danger" ? 0 : DURACION_POR_DEFECTO;
  }
}
