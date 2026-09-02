import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { NotificationsService } from "../../../core/services/notifications";
import type { Contact, ContactRole } from "../../../models/contact.model";
import { Badge, Button, Input } from "../../../shared/ui";
import type { BadgeVariant } from "../../../shared/ui";
import { ETIQUETA_DEL_ROL, VARIANTE_DEL_ROL } from "../contact-role";
import { ContactStore } from "../contact-store";

const FECHA = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

@Component({
  selector: "app-contact-list",
  imports: [Badge, Button, Input, RouterLink],
  templateUrl: "./contact-list.html",
  styleUrl: "./contact-list.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactList {
  private readonly store = inject(ContactStore);
  private readonly avisos = inject(NotificationsService);

  protected readonly contactos = this.store.items;
  protected readonly cargando = this.store.loading;
  protected readonly total = this.store.count;

  protected readonly busqueda = signal("");
  protected readonly porBorrar = signal<number | null>(null);
  protected readonly error = signal("");

  protected readonly visibles = computed(() => {
    const aguja = this.busqueda().trim().toLowerCase();
    const contactos = this.contactos();
    if (!aguja) {
      return contactos;
    }
    return contactos.filter(
      (contacto) =>
        contacto.name.toLowerCase().includes(aguja) ||
        contacto.email.includes(aguja),
    );
  });

  constructor() {
    void this.cargar(() => this.store.ensureLoaded());
  }

  protected recargar(): void {
    void this.cargar(() => this.store.load());
  }

  protected pedirBorrado(contacto: Contact): void {
    this.porBorrar.set(contacto.id);
  }

  protected cancelarBorrado(): void {
    this.porBorrar.set(null);
  }

  protected async borrar(contacto: Contact): Promise<void> {
    this.error.set("");
    try {
      await this.store.remove(contacto.id);
      this.avisos.push({
        variant: "warning",
        title: "Contacto eliminado",
        detail: contacto.name,
      });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.porBorrar.set(null);
    }
  }

  protected etiquetaDelRol(role: ContactRole): string {
    return ETIQUETA_DEL_ROL[role];
  }

  protected varianteDelRol(role: ContactRole): BadgeVariant {
    return VARIANTE_DEL_ROL[role];
  }

  protected alta(createdAt: number): string {
    return FECHA.format(createdAt);
  }

  private async cargar(accion: () => Promise<void>): Promise<void> {
    this.error.set("");
    try {
      await accion();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    }
  }
}
