import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import {
  email,
  form,
  FormField,
  FormRoot,
  minLength,
  required,
  requiredError,
  submit,
  validate,
} from "@angular/forms/signals";

import { ACCENT_PRESETS, AccentService } from "../../core/services/accent";
import {
  KeyboardService,
  type RegisteredShortcut,
} from "../../core/services/keyboard";
import {
  Badge,
  Button,
  Card,
  FilePicker,
  GestureButton,
  Input,
  Select,
  Textarea,
} from "../../shared/ui";
import type {
  BadgeAppearance,
  BadgeVariant,
  ButtonVariant,
  RejectedFile,
  SelectOption,
} from "../../shared/ui";

interface Alta {
  nombre: string;
  correo: string;
  area: string;
  notas: string;
  adjuntos: readonly File[];
}

@Component({
  selector: "app-styleguide",
  imports: [
    Badge,
    Button,
    Card,
    FilePicker,
    GestureButton,
    Input,
    Select,
    Textarea,
    FormField,
    FormRoot,
  ],
  templateUrl: "./styleguide.html",
  styleUrl: "./styleguide.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Styleguide {
  protected readonly accents = inject(AccentService);
  protected readonly presets = ACCENT_PRESETS;

  private readonly teclado = inject(KeyboardService);

  protected readonly atajos = signal<readonly RegisteredShortcut[]>([]);
  protected readonly ultimoAtajo = signal("—");
  protected readonly disparos = signal(0);

  constructor() {
    this.teclado.register(
      {
        key: "a",
        ctrl: true,
        alt: true,
        description: "Siguiente tono de acento",
      },
      () => this.disparar("Ctrl/Cmd + Alt + A", () => this.siguienteTono()),
    );
    this.teclado.register(
      {
        key: "r",
        ctrl: true,
        alt: true,
        description: "Restaurar el tono base",
      },
      () => this.disparar("Ctrl/Cmd + Alt + R", () => this.accents.reset()),
    );

    this.atajos.set(this.teclado.list());
  }

  protected combo(atajo: RegisteredShortcut): string {
    const partes: string[] = [];
    if (atajo.ctrl) partes.push("Ctrl/Cmd");
    if (atajo.shift) partes.push("Shift");
    if (atajo.alt) partes.push("Alt");
    partes.push(atajo.key.length === 1 ? atajo.key.toUpperCase() : atajo.key);
    return partes.join(" + ");
  }

  private disparar(combinacion: string, accion: () => void): void {
    accion();
    this.ultimoAtajo.set(combinacion);
    this.disparos.update((n) => n + 1);
  }

  private siguienteTono(): void {
    const actual = this.presets.findIndex(
      (preset) => preset.hue === this.accents.hue(),
    );
    const siguiente = this.presets[(actual + 1) % this.presets.length];
    this.elegirTono(siguiente.hue);
  }

  protected cambiarTono(event: Event): void {
    this.elegirTono((event.target as HTMLInputElement).valueAsNumber);
  }

  protected elegirTono(hue: number): void {
    if (this.accents.locked) {
      this.accents.previewHue(hue);
    } else {
      this.accents.setHue(hue);
    }
  }

  protected readonly surfaceTokens = [
    "--bg-app",
    "--bg-surface",
    "--bg-surface-alt",
    "--bg-surface-hover",
    "--bg-surface-active",
    "--border-default",
    "--border-strong",
  ];
  protected readonly accentTokens = [
    "--accent",
    "--accent-hover",
    "--accent-active",
    "--accent-subtle",
    "--accent-border",
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

  protected readonly gestos = signal<readonly string[]>([]);

  protected registrarGesto(nombre: string): void {
    this.gestos.update((previos) => [nombre, ...previos].slice(0, 6));
  }

  protected readonly badgeAppearances: readonly {
    name: BadgeAppearance;
    peso: string;
    nota: string;
  }[] = [
    {
      name: "outline",
      peso: "por defecto · sólo trazo",
      nota: "Sin relleno: el trazo lo lleva el color del texto. Es la de uso general porque no compite con el fondo de la fila — deja pasar el hover en vez de quedarse congelada encima. Su trazo va a 4.5:1 contra las cuatro superficies, el doble de lo que pide WCAG para un gráfico.",
    },
    {
      name: "tonal",
      peso: "énfasis · relleno medio",
      nota: "Relleno en el punto medio de luminosidad de la paleta, con texto profundo de la misma familia. Para lo que debe notarse sin gritar: el estado que rompe la norma en una lista, no los veinte que la cumplen.",
    },
  ];

  protected readonly areas: readonly SelectOption[] = [
    { value: "front", label: "Frontend" },
    { value: "back", label: "Backend" },
    { value: "infra", label: "Infraestructura" },
    { value: "qa", label: "QA (sin cupo)", disabled: true },
  ];

  protected readonly cromaHoy = signal("");
  protected readonly cromaTecho = signal("");
  protected readonly cromaMarca = signal("");

  protected readonly sueltoTexto = signal("");
  protected readonly sueltoArea = signal("");
  protected readonly sueltoNotas = signal("");

  protected readonly cmpTop = signal("Ada Lovelace");
  protected readonly cmpTopSel = signal("back");
  protected readonly cmpFloat = signal("Ada Lovelace");
  protected readonly cmpFloatSel = signal("back");
  protected readonly cmpInset = signal("Ada Lovelace");
  protected readonly cmpInsetSel = signal("back");

  protected readonly floatVacio = signal("");
  protected readonly floatLleno = signal("Ada Lovelace");
  protected readonly floatArea = signal("");
  protected readonly floatNotas = signal("");

  protected readonly adjuntos = signal<readonly File[]>([]);
  protected readonly soloSoltar = signal<readonly File[]>([]);
  protected readonly soloExplorar = signal<readonly File[]>([]);
  protected readonly soloPegar = signal<readonly File[]>([]);
  protected readonly unaImagen = signal<readonly File[]>([]);
  protected readonly hastaTres = signal<readonly File[]>([]);
  protected readonly sinMiniatura = signal<readonly File[]>([]);
  protected readonly adjuntosInertes = signal<readonly File[]>([]);
  protected readonly rechazos = signal<readonly string[]>([]);

  protected readonly modelo = signal<Alta>({
    nombre: "",
    correo: "",
    area: "",
    notas: "",
    adjuntos: [],
  });

  protected readonly alta = form(this.modelo, (path) => {
    required(path.nombre, { message: "El nombre es obligatorio." });
    minLength(path.nombre, 3, { message: "Mínimo 3 caracteres." });
    required(path.correo, { message: "El correo es obligatorio." });
    email(path.correo, { message: "Ese correo no tiene buena pinta." });
    required(path.area, { message: "Elige un área." });
    validate(path.adjuntos, ({ value }) =>
      value().length === 0
        ? requiredError({ message: "Adjunta al menos un archivo." })
        : undefined,
    );
  });

  protected readonly enviado = signal("");

  protected anotarRechazos(lote: readonly RejectedFile[]): void {
    this.rechazos.set(lote.map((r) => `${r.file.name} → ${r.reason}`));
  }

  protected async enviar(): Promise<void> {
    this.enviado.set("");
    await submit(this.alta, async () => {
      const { adjuntos, ...resto } = this.modelo();
      const legible = { ...resto, adjuntos: adjuntos.map((file) => file.name) };
      this.enviado.set(JSON.stringify(legible, null, 2));
      return undefined;
    });
  }

  protected reiniciar(): void {
    this.modelo.set({ nombre: "", correo: "", area: "", notas: "", adjuntos: [] });
    this.enviado.set("");
  }
}
