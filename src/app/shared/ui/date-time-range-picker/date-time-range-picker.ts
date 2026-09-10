import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { FormValueControl, ValidationError } from "@angular/forms/signals";

import { AnchoredPanel } from "../anchored-panel/anchored-panel";
import { Button } from "../button/button";
import {
  idDeControl,
  idDelMensaje,
  primerError,
} from "../field-shell/control-state";
import { FieldShell, LabelMode } from "../field-shell/field-shell";
import {
  ahoraUTC,
  aInstante,
  aLocal,
  formatearInstante,
  formatearRangoConHora,
  RANGOS_HABITUALES_CON_HORA,
  type DateTimeRange,
  type DateTimeRangePreset,
  type DateTimeSpan,
} from "./date-time-range";

interface PresetResuelto {
  readonly preset: DateTimeRangePreset;
  readonly rango: DateTimeSpan;
  readonly disponible: boolean;
}

@Component({
  selector: "app-date-time-range-picker",
  imports: [Button, FieldShell],
  templateUrl: "./date-time-range-picker.html",
  styleUrl: "./date-time-range-picker.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTimeRangePicker
  implements FormValueControl<DateTimeRange | null>
{
  readonly value = model<DateTimeRange | null>(null);

  readonly label = input("");
  readonly labelMode = input<LabelMode>("top");
  readonly placeholder = input("Cualquier momento");
  readonly presets = input<readonly DateTimeRangePreset[]>(
    RANGOS_HABITUALES_CON_HORA,
  );
  readonly minDateTime = input("");
  readonly maxDateTime = input("");
  readonly minuteStep = input(1);
  readonly hint = input("");

  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly touched = input(false);
  readonly name = input("");

  readonly touch = output<void>();

  private readonly disparador =
    viewChild.required<ElementRef<HTMLButtonElement>>("disparador");
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");

  protected readonly capa = new AnchoredPanel({
    disparador: this.disparador,
    panel: this.panel,
    alAbrir: () => {
      const rango = this.value();
      this.desde.set(rango ? aLocal(rango.from) : "");
      this.hasta.set(rango ? aLocal(rango.to) : "");
      this.aviso.set("");
      this.ahora.set(ahoraUTC());
    },
    alCerrar: () => {
      this.aviso.set("");
      this.touch.emit();
    },
  });

  protected readonly id = idDeControl("app-date-time-range-picker");
  protected readonly aviso = signal("");
  protected readonly desde = signal("");
  protected readonly hasta = signal("");
  private readonly ahora = signal(ahoraUTC());

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

  protected readonly paso = computed(() => this.minuteStep() * 60);

  protected readonly minLocal = computed(() => aLocal(this.minDateTime()));
  protected readonly maxLocal = computed(() => aLocal(this.maxDateTime()));

  protected readonly etiqueta = computed(() => {
    const rango = this.value();
    if (!rango) {
      return this.placeholder();
    }
    const preset = this.presets().find((p) => p.id === rango.presetId);
    return preset?.label || formatearRangoConHora(rango) || this.placeholder();
  });

  protected readonly opciones = computed<readonly PresetResuelto[]>(() => {
    const ahora = this.ahora();
    const min = this.minDateTime();
    const max = this.maxDateTime();
    return this.presets().map((preset) => {
      const rango = preset.resolve(ahora);
      const disponible =
        (!min || rango.from >= min) && (!max || rango.to <= max);
      return { preset, rango, disponible };
    });
  });

  focus(): void {
    this.disparador().nativeElement.focus();
  }

  protected alternar(): void {
    if (this.bloqueado()) return;
    this.capa.alternar();
  }

  protected elegir(opcion: PresetResuelto): void {
    if (!opcion.disponible) return;
    this.value.set({ ...opcion.rango, presetId: opcion.preset.id });
    this.capa.cerrar();
  }

  protected esActivo(preset: DateTimeRangePreset): boolean {
    return this.value()?.presetId === preset.id;
  }

  protected aplicar(): void {
    const desde = this.desde();
    const hasta = this.hasta();
    if (!desde || !hasta) {
      this.aviso.set("Indica las dos fechas y sus horas.");
      return;
    }
    const from = aInstante(desde);
    const to = aInstante(hasta);
    if (!from || !to) {
      this.aviso.set("Alguna de las fechas no es válida.");
      return;
    }
    if (this.reencajarHoraInexistente(desde, from, hasta, to)) {
      return;
    }
    if (!this.multiploDelPaso(desde) || !this.multiploDelPaso(hasta)) {
      this.aviso.set(`Los minutos van de ${this.minuteStep()} en ${this.minuteStep()}.`);
      return;
    }
    if (from >= to) {
      this.aviso.set("El final tiene que ser posterior al inicio.");
      return;
    }
    const min = this.minDateTime();
    if (min && from < min) {
      this.aviso.set(`No puede empezar antes del ${this.comoTexto(min)}.`);
      return;
    }
    const max = this.maxDateTime();
    if (max && to > max) {
      this.aviso.set(`No puede terminar después del ${this.comoTexto(max)}.`);
      return;
    }
    this.value.set({ from, to });
    this.capa.cerrar();
  }

  protected limpiar(): void {
    this.desde.set("");
    this.hasta.set("");
    this.value.set(null);
    this.capa.cerrar();
  }

  private reencajarHoraInexistente(
    desde: string,
    from: string,
    hasta: string,
    to: string,
  ): boolean {
    const desdeReal = aLocal(from);
    const hastaReal = aLocal(to);
    if (desdeReal === desde && hastaReal === hasta) {
      return false;
    }
    this.desde.set(desdeReal);
    this.hasta.set(hastaReal);
    const corregida = desdeReal === desde ? hastaReal : desdeReal;
    this.aviso.set(
      `Esa hora no existe por el cambio de horario; se ha usado ${corregida.slice(11)}.`,
    );
    return true;
  }

  private multiploDelPaso(local: string): boolean {
    const paso = this.minuteStep();
    if (paso <= 1) {
      return true;
    }
    return Number(local.slice(14)) % paso === 0;
  }

  private comoTexto(instante: string): string {
    return formatearInstante(instante);
  }
}
