import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from "@angular/core";
import {
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  submit,
} from "@angular/forms/signals";

import { NotificationsService } from "../../core/services/notifications";
import type {
  Contact,
  ContactDraft,
  ContactRole,
} from "../../models/contact.model";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Select,
  Textarea,
} from "../../shared/ui";
import type { BadgeVariant, SelectOption } from "../../shared/ui";
import { ContactStore } from "./contact-store";

const VACIO: ContactDraft = { name: "", email: "", role: "", notes: "" };

const ETIQUETA_DEL_ROL: Record<ContactRole, string> = {
  admin: "Administración",
  editor: "Edición",
  viewer: "Sólo lectura",
};

const VARIANTE_DEL_ROL: Record<ContactRole, BadgeVariant> = {
  admin: "primary",
  editor: "info",
  viewer: "neutral",
};

const ROLES: readonly SelectOption[] = (
  Object.keys(ETIQUETA_DEL_ROL) as ContactRole[]
).map((value) => ({ value, label: ETIQUETA_DEL_ROL[value] }));

const FECHA = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

@Component({
  selector: "app-contacts",
  imports: [
    Badge,
    Button,
    Card,
    ConfirmDialog,
    FormField,
    FormRoot,
    Input,
    Select,
    Textarea,
  ],
  providers: [ContactStore],
  templateUrl: "./contacts.html",
  styleUrl: "./contacts.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contacts {
  private readonly store = inject(ContactStore);
  private readonly avisos = inject(NotificationsService);

  private readonly campoDelNombre = viewChild<Input>("nombre");
  readonly #foco = signal(0);

  protected readonly roles = ROLES;
  protected readonly contactos = this.store.items;
  protected readonly cargando = this.store.loading;
  protected readonly total = this.store.count;

  protected readonly busqueda = signal("");

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

  protected readonly editando = signal<Contact | null>(null);
  protected readonly avisoDeDescarte = signal(false);
  readonly #alDescartar = signal<(() => void) | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly porBorrar = signal<number | null>(null);
  protected readonly errorDeLaLista = signal("");

  protected readonly modelo = signal<ContactDraft>({ ...VACIO });

  protected readonly ficha = form(this.modelo, (path) => {
    required(path.name, { message: "El nombre es obligatorio." });
    minLength(path.name, 2, { message: "Mínimo 2 caracteres." });
    maxLength(path.name, 80, { message: "Máximo 80 caracteres." });
    required(path.email, { message: "El correo es obligatorio." });
    email(path.email, {
      message: "Escribe un correo con la forma nombre@dominio.",
    });
    required(path.role, { message: "Elige un rol." });
    maxLength(path.notes, 280, { message: "Máximo 280 caracteres." });
  });

  protected readonly errorDelFormulario = linkedSignal<ContactDraft, string>({
    source: this.modelo,
    computation: () => "",
  });

  protected readonly titulo = computed(() =>
    this.editando() ? "Editar contacto" : "Nuevo contacto",
  );

  constructor() {
    void this.cargar();

    effect(() => {
      if (this.#foco() === 0) return;
      this.campoDelNombre()?.focus();
    });
  }

  protected nuevo(): void {
    this.conCambiosPendientes(() => this.abrir(null));
  }

  protected editar(contacto: Contact): void {
    this.conCambiosPendientes(() => this.abrir(contacto));
  }

  protected cancelar(): void {
    this.conCambiosPendientes(() => this.cerrar());
  }

  protected descartar(): void {
    const accion = this.#alDescartar();
    this.olvidarElDescarte();
    accion?.();
  }

  protected seguirEditando(): void {
    this.olvidarElDescarte();
  }

  protected recargar(): void {
    void this.cargar();
  }

  protected async guardar(): Promise<void> {
    await submit(this.ficha, async () => {
      const enEdicion = this.editando();
      try {
        const guardado = enEdicion
          ? await this.store.update(enEdicion.id, this.modelo())
          : await this.store.create(this.modelo());
        this.avisos.push({
          variant: "success",
          title: enEdicion ? "Contacto actualizado" : "Contacto creado",
          detail: guardado.name,
        });
        this.cerrar();
      } catch (e) {
        this.errorDelFormulario.set(mensaje(e));
      }
      return undefined;
    });
  }

  protected pedirBorrado(contacto: Contact): void {
    this.porBorrar.set(contacto.id);
  }

  protected cancelarBorrado(): void {
    this.porBorrar.set(null);
  }

  protected async borrar(contacto: Contact): Promise<void> {
    this.errorDeLaLista.set("");
    try {
      await this.store.remove(contacto.id);
      this.avisos.push({
        variant: "warning",
        title: "Contacto eliminado",
        detail: contacto.name,
      });
      if (this.editando()?.id === contacto.id) {
        this.cerrar();
      }
    } catch (e) {
      this.errorDeLaLista.set(mensaje(e));
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

  private conCambiosPendientes(accion: () => void): void {
    if (!this.formularioAbierto() || !this.ficha().dirty()) {
      accion();
      return;
    }
    this.#alDescartar.set(accion);
    this.avisoDeDescarte.set(true);
  }

  private olvidarElDescarte(): void {
    this.avisoDeDescarte.set(false);
    this.#alDescartar.set(null);
  }

  private abrir(contacto: Contact | null): void {
    this.editando.set(contacto);
    this.modelo.set(
      contacto
        ? {
            name: contacto.name,
            email: contacto.email,
            role: contacto.role,
            notes: contacto.notes,
          }
        : { ...VACIO },
    );
    this.ficha().reset();
    this.porBorrar.set(null);
    this.formularioAbierto.set(true);
    this.#foco.update((veces) => veces + 1);
  }

  private cerrar(): void {
    this.formularioAbierto.set(false);
    this.editando.set(null);
    this.modelo.set({ ...VACIO });
    this.ficha().reset();
  }

  private async cargar(): Promise<void> {
    this.errorDeLaLista.set("");
    try {
      await this.store.load();
    } catch (e) {
      this.errorDeLaLista.set(mensaje(e));
    }
  }
}

function mensaje(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
