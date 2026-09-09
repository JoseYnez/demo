import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { FormValueControl, ValidationError } from "@angular/forms/signals";

import { Button } from "../button/button";
import {
  idDeControl,
  idDelMensaje,
  primerError,
} from "../field-shell/control-state";
import { FieldShell, LabelMode } from "../field-shell/field-shell";
import {
  esISO,
  formatearRango,
  hoyISO,
  RANGOS_HABITUALES,
  type DateRange,
  type DateRangePreset,
  type DateSpan,
} from "./date-range";

interface PresetResuelto {
  readonly preset: DateRangePreset;
  readonly rango: DateSpan;
  readonly disponible: boolean;
}

interface ZonaVisible {
  readonly top: number;
  readonly bottom: number;
  readonly right: number;
}

@Component({
  selector: "app-date-range-picker",
  imports: [Button, FieldShell],
  templateUrl: "./date-range-picker.html",
  styleUrl: "./date-range-picker.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangePicker implements FormValueControl<DateRange | null> {
  readonly value = model<DateRange | null>(null);

  readonly label = input("");
  readonly labelMode = input<LabelMode>("top");
  readonly placeholder = input("Cualquier fecha");
  readonly presets = input<readonly DateRangePreset[]>(RANGOS_HABITUALES);
  readonly minDate = input("");
  readonly maxDate = input("");
  readonly hint = input("");

  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly touched = input(false);
  readonly name = input("");

  readonly touch = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly disparador =
    viewChild.required<ElementRef<HTMLButtonElement>>("disparador");
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");

  protected readonly id = idDeControl("app-date-range-picker");
  protected readonly abierto = signal(false);
  protected readonly arriba = signal(false);
  protected readonly aLaDerecha = signal(false);
  protected readonly aviso = signal("");
  protected readonly desde = signal("");
  protected readonly hasta = signal("");
  private readonly hoy = signal(hoyISO());

  protected readonly bloqueado = computed(
    () => this.disabled() || this.readonly(),
  );

  protected readonly floated = computed(() => this.labelMode() === "float");

  protected readonly error = computed(() =>
    primerError(this.touched(), this.errors()),
  );

  protected readonly describedBy = computed(() =>
    idDelMensaje(this.id, !!this.error() || !!this.hint()),
  );

  protected readonly vacio = computed(() => this.value() === null);

  protected readonly etiqueta = computed(() => {
    const rango = this.value();
    if (!rango) {
      return this.placeholder();
    }
    const preset = this.presets().find((p) => p.id === rango.presetId);
    return preset?.label || formatearRango(rango) || this.placeholder();
  });

  protected readonly opciones = computed<readonly PresetResuelto[]>(() => {
    const hoy = this.hoy();
    const min = this.minDate();
    const max = this.maxDate();
    return this.presets().map((preset) => {
      const rango = preset.resolve(hoy);
      const disponible =
        (!min || rango.from >= min) && (!max || rango.to <= max);
      return { preset, rango, disponible };
    });
  });

  constructor() {
    effect(() => {
      const panel = this.panel()?.nativeElement;
      if (!panel) return;
      untracked(() => {
        panel.focus({ preventScroll: true });
        this.colocar(panel);
      });
    });

    effect((alLimpiar) => {
      if (!this.abierto()) return;
      const alPulsarFuera = (event: PointerEvent) => {
        const destino = event.target;
        if (
          destino instanceof Node &&
          this.host.nativeElement.contains(destino)
        ) {
          return;
        }
        untracked(() => this.cerrar(false));
      };
      document.addEventListener("pointerdown", alPulsarFuera, true);
      alLimpiar(() =>
        document.removeEventListener("pointerdown", alPulsarFuera, true),
      );
    });
  }

  focus(): void {
    this.disparador().nativeElement.focus();
  }

  protected alternar(): void {
    if (this.bloqueado()) return;
    if (this.abierto()) {
      this.cerrar();
      return;
    }
    const rango = this.value();
    this.desde.set(rango?.from ?? "");
    this.hasta.set(rango?.to ?? "");
    this.aviso.set("");
    this.hoy.set(hoyISO());
    this.arriba.set(false);
    this.aLaDerecha.set(false);
    this.abierto.set(true);
  }

  protected cerrar(devolverElFoco = true): void {
    if (!this.abierto()) return;
    this.abierto.set(false);
    this.aviso.set("");
    this.touch.emit();
    if (devolverElFoco) {
      this.disparador().nativeElement.focus();
    }
  }

  protected elegir(opcion: PresetResuelto): void {
    if (!opcion.disponible) return;
    this.value.set({ ...opcion.rango, presetId: opcion.preset.id });
    this.cerrar();
  }

  protected esActivo(preset: DateRangePreset): boolean {
    return this.value()?.presetId === preset.id;
  }

  protected aplicar(): void {
    const from = this.desde();
    const to = this.hasta();
    if (!from || !to) {
      this.aviso.set("Indica las dos fechas.");
      return;
    }
    if (!esISO(from) || !esISO(to)) {
      this.aviso.set("Alguna de las fechas no es válida.");
      return;
    }
    if (from > to) {
      this.aviso.set("La fecha inicial no puede ser posterior a la final.");
      return;
    }
    const min = this.minDate();
    if (min && from < min) {
      this.aviso.set(`No puede empezar antes del ${this.comoTexto(min)}.`);
      return;
    }
    const max = this.maxDate();
    if (max && to > max) {
      this.aviso.set(`No puede terminar después del ${this.comoTexto(max)}.`);
      return;
    }
    this.value.set({ from, to });
    this.cerrar();
  }

  protected limpiar(): void {
    this.desde.set("");
    this.hasta.set("");
    this.value.set(null);
    this.cerrar();
  }

  protected alPulsarTecla(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !this.abierto()) return;
    event.preventDefault();
    event.stopPropagation();
    this.cerrar();
  }

  protected alSalirElFoco(event: FocusEvent): void {
    const siguiente = event.relatedTarget;
    if (!(siguiente instanceof Node)) return;
    if (this.host.nativeElement.contains(siguiente)) return;
    this.cerrar(false);
  }

  private comoTexto(iso: string): string {
    return formatearRango({ from: iso, to: iso });
  }

  private colocar(panel: HTMLElement): void {
    const caja = panel.getBoundingClientRect();
    if (caja.height === 0) return;
    const disparador = this.disparador().nativeElement.getBoundingClientRect();
    const zona = this.zonaVisible();
    const hueco = caja.top - disparador.bottom;
    const cabeDebajo = caja.bottom <= zona.bottom;
    const cabeEncima = disparador.top - hueco - caja.height >= zona.top;
    this.arriba.set(!cabeDebajo && cabeEncima);
    this.aLaDerecha.set(caja.right > zona.right);
    if (!cabeDebajo && !cabeEncima) {
      panel.scrollIntoView({ block: "nearest" });
    }
  }

  private zonaVisible(): ZonaVisible {
    const raiz = document.documentElement;
    const zona = { top: 0, bottom: raiz.clientHeight, right: raiz.clientWidth };
    for (
      let el = this.host.nativeElement.parentElement;
      el;
      el = el.parentElement
    ) {
      const { overflowY } = getComputedStyle(el);
      if (overflowY !== "auto" && overflowY !== "scroll") continue;
      const caja = el.getBoundingClientRect();
      return {
        top: Math.max(caja.top, zona.top),
        bottom: Math.min(caja.bottom, zona.bottom),
        right: Math.min(caja.right, zona.right),
      };
    }
    return zona;
  }
}
