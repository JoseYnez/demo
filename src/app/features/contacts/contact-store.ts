import { computed, Service, signal } from "@angular/core";

import type { Contact, ContactDraft } from "../../models/contact.model";
import { contactApi, mensajeDelBackend } from "../../tauri";

@Service({ autoProvided: false })
export class ContactStore {
  readonly #items = signal<readonly Contact[]>([]);
  readonly #loading = signal(false);
  readonly #loaded = signal(false);

  readonly items = this.#items.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly loaded = this.#loaded.asReadonly();
  readonly count = computed(() => this.#items().length);

  byId(id: number): Contact | undefined {
    return this.#items().find((item) => item.id === id);
  }

  async ensureLoaded(): Promise<void> {
    if (this.#loaded() || this.#loading()) {
      return;
    }
    await this.load();
  }

  async load(): Promise<void> {
    this.#loading.set(true);
    try {
      this.#items.set(ordenados(await contactApi.list()));
      this.#loaded.set(true);
    } catch (e) {
      throw new Error(mensajeDelBackend(e));
    } finally {
      this.#loading.set(false);
    }
  }

  async create(draft: ContactDraft): Promise<Contact> {
    const creado = await this.pedir(() => contactApi.create(draft));
    this.#items.update((items) => ordenados([...items, creado]));
    return creado;
  }

  async update(id: number, draft: ContactDraft): Promise<Contact> {
    const guardado = await this.pedir(() => contactApi.update(id, draft));
    this.#items.update((items) =>
      ordenados(items.map((item) => (item.id === id ? guardado : item))),
    );
    return guardado;
  }

  async remove(id: number): Promise<void> {
    await this.pedir(() => contactApi.remove(id));
    this.#items.update((items) => items.filter((item) => item.id !== id));
  }

  private async pedir<T>(accion: () => Promise<T>): Promise<T> {
    try {
      return await accion();
    } catch (e) {
      throw new Error(mensajeDelBackend(e));
    }
  }
}

function ordenados(contactos: readonly Contact[]): readonly Contact[] {
  return [...contactos].sort((a, b) => a.name.localeCompare(b.name, "es"));
}
