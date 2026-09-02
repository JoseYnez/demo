import { computed, Service, signal } from "@angular/core";

import type {
  AppNotification,
  NewNotification,
} from "../../models/notification.model";

@Service()
export class NotificationsService {
  readonly #items = signal<readonly AppNotification[]>([]);
  #ultimoId = 0;

  readonly items = this.#items.asReadonly();
  readonly unread = computed(
    () => this.#items().filter((item) => !item.read).length,
  );

  push(notification: NewNotification): string {
    const id = `n${++this.#ultimoId}`;
    this.#items.update((items) => [
      { ...notification, id, read: false },
      ...items,
    ]);
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
  }

  clear(): void {
    this.#items.set([]);
  }
}
