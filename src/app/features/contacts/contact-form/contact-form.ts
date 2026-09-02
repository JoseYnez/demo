import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
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
import { Router, RouterLink } from "@angular/router";

import type { PuedeSalir } from "../../../core/guards/unsaved-changes-guard";
import { NotificationsService } from "../../../core/services/notifications";
import type { Contact, ContactDraft } from "../../../models/contact.model";
import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  Select,
  Textarea,
} from "../../../shared/ui";
import { ROLES } from "../contact-role";
import { ContactStore } from "../contact-store";

const VACIO: ContactDraft = { name: "", email: "", role: "", notes: "" };

function comoBorrador(contacto: Contact | null): ContactDraft {
  return contacto
    ? {
        name: contacto.name,
        email: contacto.email,
        role: contacto.role,
        notes: contacto.notes,
      }
    : { ...VACIO };
}

@Component({
  selector: "app-contact-form",
  imports: [
    Button,
    Card,
    ConfirmDialog,
    FormField,
    FormRoot,
    Input,
    RouterLink,
    Select,
    Textarea,
  ],
  templateUrl: "./contact-form.html",
  styleUrl: "./contact-form.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactForm implements PuedeSalir {
  private readonly store = inject(ContactStore);
  private readonly avisos = inject(NotificationsService);
  private readonly router = inject(Router);

  private readonly campoDelNombre = viewChild<Input>("nombre");

  readonly id = input<string>();

  protected readonly roles = ROLES;
  protected readonly errorDeCarga = signal("");
  protected readonly avisoDeDescarte = signal(false);
  readonly #decidir = signal<((salir: boolean) => void) | null>(null);

  protected readonly editando = computed(() => this.id() !== undefined);

  protected readonly contacto = computed(() => {
    const id = Number(this.id());
    return Number.isFinite(id) ? (this.store.byId(id) ?? null) : null;
  });

  protected readonly cargando = computed(
    () =>
      this.editando() &&
      !this.store.loaded() &&
      !this.contacto() &&
      !this.errorDeCarga(),
  );

  protected readonly noEncontrado = computed(
    () => this.editando() && this.store.loaded() && !this.contacto(),
  );

  protected readonly titulo = computed(() =>
    this.editando() ? "Editar contacto" : "Nuevo contacto",
  );

  protected readonly modelo = linkedSignal<Contact | null, ContactDraft>({
    source: this.contacto,
    computation: comoBorrador,
  });

  protected readonly error = linkedSignal<ContactDraft, string>({
    source: this.modelo,
    computation: () => "",
  });

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

  constructor() {
    void this.cargar();

    effect(() => {
      if (this.cargando() || this.noEncontrado()) return;
      this.campoDelNombre()?.focus();
    });
  }

  puedeSalir(): boolean | Promise<boolean> {
    if (!this.ficha().dirty()) {
      return true;
    }
    this.avisoDeDescarte.set(true);
    return new Promise<boolean>((resolve) => this.#decidir.set(resolve));
  }

  protected descartar(): void {
    this.decidir(true);
  }

  protected seguirEditando(): void {
    this.decidir(false);
  }

  protected volver(): void {
    void this.router.navigate(["/contacts"]);
  }

  protected async guardar(): Promise<void> {
    await submit(this.ficha, async () => {
      const enEdicion = this.contacto();
      try {
        const guardado = enEdicion
          ? await this.store.update(enEdicion.id, this.modelo())
          : await this.store.create(this.modelo());
        this.avisos.push({
          variant: "success",
          title: enEdicion ? "Contacto actualizado" : "Contacto creado",
          detail: guardado.name,
        });
        this.ficha().reset();
        this.volver();
      } catch (e) {
        this.error.set(e instanceof Error ? e.message : String(e));
      }
      return undefined;
    });
  }

  private decidir(salir: boolean): void {
    this.avisoDeDescarte.set(false);
    const resolver = this.#decidir();
    this.#decidir.set(null);
    resolver?.(salir);
  }

  private async cargar(): Promise<void> {
    try {
      await this.store.ensureLoaded();
    } catch (e) {
      this.errorDeCarga.set(e instanceof Error ? e.message : String(e));
    }
  }
}
