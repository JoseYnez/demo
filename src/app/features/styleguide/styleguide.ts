import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import {
  email,
  form,
  FormField,
  FormRoot,
  minLength,
  required,
  submit,
} from "@angular/forms/signals";

import { Badge, Button, Card, Input, Select, Textarea } from "../../shared/ui";
import type { BadgeVariant, ButtonVariant, SelectOption } from "../../shared/ui";

interface Alta {
  nombre: string;
  correo: string;
  area: string;
  notas: string;
}

@Component({
  selector: "app-styleguide",
  imports: [Badge, Button, Card, Input, Select, Textarea, FormField, FormRoot],
  templateUrl: "./styleguide.html",
  styleUrl: "./styleguide.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Styleguide {
  protected readonly surfaceTokens = [
    "--bg-app",
    "--bg-surface",
    "--bg-surface-alt",
    "--border-default",
    "--border-strong",
  ];
  protected readonly accentTokens = [
    "--accent",
    "--accent-hover",
    "--accent-active",
    "--accent-subtle",
  ];
  protected readonly stateTokens = ["success", "warning", "danger", "info"];
  protected readonly fontSizes = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"];
  protected readonly spaces = ["1", "2", "3", "4", "6", "8", "12", "16"];
  protected readonly radii = ["sm", "md", "lg", "xl"];
  protected readonly shadows = ["sm", "md", "lg", "xl"];

  protected readonly buttonVariants: readonly ButtonVariant[] = [
    "primary",
    "secondary",
    "ghost",
    "danger",
  ];
  protected readonly badgeVariants: readonly BadgeVariant[] = [
    "neutral",
    "primary",
    "success",
    "warning",
    "danger",
    "info",
  ];

  protected readonly areas: readonly SelectOption[] = [
    { value: "front", label: "Frontend" },
    { value: "back", label: "Backend" },
    { value: "infra", label: "Infraestructura" },
    { value: "qa", label: "QA (sin cupo)", disabled: true },
  ];

  /* Uso suelto: two-way con [(value)], sin formulario de por medio. */
  protected readonly sueltoTexto = signal("");
  protected readonly sueltoArea = signal("");
  protected readonly sueltoNotas = signal("");

  /* Uso con Signal Forms: el modelo es la fuente de verdad y `form()` le cuelga
     el estado de validación que los controles consumen vía [formField]. */
  protected readonly modelo = signal<Alta>({
    nombre: "",
    correo: "",
    area: "",
    notas: "",
  });

  protected readonly alta = form(this.modelo, (path) => {
    required(path.nombre, { message: "El nombre es obligatorio." });
    minLength(path.nombre, 3, { message: "Mínimo 3 caracteres." });
    required(path.correo, { message: "El correo es obligatorio." });
    email(path.correo, { message: "Ese correo no tiene buena pinta." });
    required(path.area, { message: "Elige un área." });
  });

  protected readonly enviado = signal("");

  protected async enviar(): Promise<void> {
    this.enviado.set("");
    await submit(this.alta, async () => {
      this.enviado.set(JSON.stringify(this.modelo(), null, 2));
      return undefined;
    });
  }

  protected reiniciar(): void {
    this.modelo.set({ nombre: "", correo: "", area: "", notas: "" });
    this.enviado.set("");
  }
}
