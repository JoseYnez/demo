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
      name: "soft",
      peso: "relleno tenue",
      nota: "Fondo de la familia y borde a juego. Es el actual y el más discreto: se lee como una etiqueta, no como un aviso.",
    },
    {
      name: "outline",
      peso: "sólo trazo",
      nota: "Sin relleno; el trazo lo lleva el color del texto. Es el que menos ruido mete en una lista larga y el único que no compite con el fondo de la fila.",
    },
    {
      name: "solid",
      peso: "relleno pleno",
      nota: "Relleno saturado con texto invertido. Es el que se ve desde lejos, así que sólo aguanta uno o dos por pantalla antes de cansar.",
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
