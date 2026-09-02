import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  type WritableSignal,
} from "@angular/core";
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
import { NotificationsService } from "../../core/services/notifications";
import type {
  AppNotification,
  NotificationVariant,
} from "../../models/notification.model";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  FilePicker,
  GestureButton,
  Input,
  NotificationPanel,
  Select,
  Textarea,
  Toast,
} from "../../shared/ui";
import type {
  BadgeAppearance,
  BadgeVariant,
  ButtonVariant,
  RejectedFile,
  SelectOption,
} from "../../shared/ui";

const RETRASO_DE_PRUEBA = 5000;
const TRABAJO_DE_PRUEBA = 1500;

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
    ConfirmDialog,
    FilePicker,
    GestureButton,
    Input,
    NotificationPanel,
    Select,
    Textarea,
    Toast,
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

  private readonly destroyRef = inject(DestroyRef);
  private readonly teclado = inject(KeyboardService);
  private readonly notificaciones = inject(NotificationsService);

  protected readonly pendientes = this.notificaciones.unread;
  protected readonly enPrimerPlano = this.notificaciones.focused;

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
    this.reponerMuestra();

    this.destroyRef.onDestroy(() => this.olvidarElRetraso());
  }

  protected readonly ejemplos: readonly {
    variant: NotificationVariant;
    title: string;
    detail: string;
  }[] = [
    {
      variant: "success",
      title: "Cambios guardados",
      detail: "El alta se registró sin incidencias.",
    },
    {
      variant: "info",
      title: "Hay una versión nueva",
      detail: "Se instalará la próxima vez que cierres la app.",
    },
    {
      variant: "warning",
      title: "Queda poco espacio",
      detail: "El disco de trabajo está al 92 %.",
    },
    {
      variant: "danger",
      title: "No se pudo guardar",
      detail: "El backend rechazó la petición. Vuelve a intentarlo.",
    },
    {
      variant: "neutral",
      title: "Sincronización terminada",
      detail: "42 registros revisados, ninguno cambió.",
    },
  ];

  protected avisar(ejemplo: (typeof this.ejemplos)[number]): void {
    this.notificaciones.push(ejemplo);
  }

  protected avisarEnLote(cuantas: number): void {
    for (let i = 1; i <= cuantas; i++) {
      this.notificaciones.push({
        title: `Aviso ${i} de ${cuantas}`,
        variant: "info",
      });
    }
  }

  private retrasado: ReturnType<typeof setTimeout> | null = null;

  protected avisarConRetraso(): void {
    this.olvidarElRetraso();
    this.retrasado = setTimeout(() => {
      this.retrasado = null;
      this.avisar(this.ejemplos[1]);
    }, RETRASO_DE_PRUEBA);
  }

  private olvidarElRetraso(): void {
    if (this.retrasado === null) return;
    clearTimeout(this.retrasado);
    this.retrasado = null;
  }

  protected avisarEnSilencio(): void {
    this.notificaciones.push({
      title: "Copia de seguridad hecha",
      detail: "Sin toast: sólo suma al contador y al panel.",
      variant: "success",
      silent: true,
    });
  }

  protected vaciarAvisos(): void {
    this.notificaciones.clear();
  }

  protected readonly muestra = signal<readonly AppNotification[]>([]);

  protected reponerMuestra(): void {
    const ahora = Date.now();
    this.muestra.set([
      {
        id: "m1",
        variant: "danger",
        title: "No se pudo guardar",
        detail: "El backend rechazó la petición. Vuelve a intentarlo.",
        createdAt: ahora - 40_000,
        duration: 0,
        read: false,
      },
      {
        id: "m2",
        variant: "success",
        title: "Cambios guardados",
        createdAt: ahora - 9 * 60_000,
        duration: 6000,
        read: false,
      },
      {
        id: "m3",
        variant: "warning",
        title: "Queda poco espacio",
        detail: "El disco de trabajo está al 92 %.",
        createdAt: ahora - 3 * 60 * 60_000,
        duration: 6000,
        read: true,
      },
      {
        id: "m4",
        variant: "neutral",
        title: "Sincronización terminada",
        createdAt: ahora - 2 * 24 * 60 * 60_000,
        duration: 6000,
        read: true,
      },
    ]);
  }

  protected quitarDeLaMuestra(id: string): void {
    this.muestra.update((items) => items.filter((item) => item.id !== id));
  }

  protected vaciarMuestra(): void {
    this.muestra.set([]);
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
    "--accent-fg",
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

  protected readonly confirmaSimple = signal(false);
  protected readonly confirmaDestructiva = signal(false);
  protected readonly confirmaLenta = signal(false);
  protected readonly trabajando = signal(false);
  protected readonly ultimaDecision = signal("—");

  protected pedirConfirmacion(cual: "simple" | "destructiva" | "lenta"): void {
    this.ultimaDecision.set("…");
    if (cual === "simple") this.confirmaSimple.set(true);
    if (cual === "destructiva") this.confirmaDestructiva.set(true);
    if (cual === "lenta") this.confirmaLenta.set(true);
  }

  protected decidir(que: string, abierto: WritableSignal<boolean>): void {
    this.ultimaDecision.set(que);
    abierto.set(false);
  }

  protected trabajarYCerrar(): void {
    this.trabajando.set(true);
    setTimeout(() => {
      this.trabajando.set(false);
      this.confirmaLenta.set(false);
      this.ultimaDecision.set("hecho tras 1,5 s");
    }, TRABAJO_DE_PRUEBA);
  }

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
