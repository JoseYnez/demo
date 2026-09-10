import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChild,
  viewChildren,
} from "@angular/core";
import { FormValueControl, ValidationError } from "@angular/forms/signals";

import { AnchoredPanel } from "../anchored-panel/anchored-panel";
import {
  idDeControl,
  idDelMensaje,
  placeholderVisible,
  primerError,
} from "../field-shell/control-state";
import { FieldShell, LabelMode } from "../field-shell/field-shell";
import {
  Coincidencia,
  ComboboxOption,
  filtrarSugerencias,
  partirCoincidencia,
} from "./suggestions";

interface Fila {
  readonly opcion: ComboboxOption;
  readonly id: string;
  readonly label: Coincidencia;
  readonly detail: Coincidencia | null;
}

@Component({
  selector: "app-combobox",
  imports: [FieldShell],
  templateUrl: "./combobox.html",
  styleUrl: "./combobox.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Combobox implements FormValueControl<string> {
  readonly value = model("");

  readonly label = input("");
  readonly labelMode = input<LabelMode>("top");
  readonly options = input.required<readonly ComboboxOption[]>();
  readonly placeholder = input("");
  readonly hint = input("");
  readonly emptyMessage = input("Sin coincidencias");
  readonly autocomplete = input("off");
  readonly clearOnOpen = input(false);

  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly touched = input(false);
  readonly name = input("");

  readonly touch = output<void>();
  readonly picked = output<ComboboxOption>();

  private readonly disparador =
    viewChild.required<ElementRef<HTMLInputElement>>("disparador");
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");
  private readonly elementos = viewChildren<ElementRef<HTMLElement>>("opcion");

  protected readonly capa = new AnchoredPanel({
    disparador: this.disparador,
    panel: this.panel,
    enfocarElPanel: false,
    alCerrar: () => {
      this.destacado.set(-1);
      this.vaciado.set(false);
    },
  });

  protected readonly id = idDeControl("app-combobox");
  protected readonly listaId = `${this.id}-lista`;

  protected readonly destacado = signal(-1);
  protected readonly focused = signal(false);
  private readonly consulta = signal("");
  private readonly vaciado = signal(false);

  protected readonly texto = computed(() => (this.vaciado() ? "" : this.value()));

  protected readonly bloqueado = computed(() => this.disabled() || this.readonly());

  protected readonly floated = computed(() => this.focused() || this.value() !== "");

  protected readonly visiblePlaceholder = computed(() =>
    placeholderVisible(this.labelMode(), this.floated(), this.placeholder()),
  );

  protected readonly error = computed(() => primerError(this.touched(), this.errors()));

  protected readonly describedBy = computed(() =>
    idDelMensaje(this.id, !!this.error() || !!this.hint()),
  );

  private readonly sugerencias = computed(() =>
    filtrarSugerencias(this.options(), this.consulta()),
  );

  protected readonly filas = computed<readonly Fila[]>(() => {
    const consulta = this.consulta();
    return this.sugerencias().map((opcion, indice) => ({
      opcion,
      id: `${this.listaId}-${indice}`,
      label: partirCoincidencia(opcion.label, consulta),
      detail: opcion.detail ? partirCoincidencia(opcion.detail, consulta) : null,
    }));
  });

  protected readonly idDestacado = computed(() => this.filas()[this.destacado()]?.id ?? null);

  protected readonly anuncio = computed(() => {
    if (!this.capa.abierto()) return "";
    const total = this.filas().length;
    if (!total) return this.emptyMessage();
    return total === 1 ? "1 sugerencia" : `${total} sugerencias`;
  });

  constructor() {
    effect(() => {
      const indice = this.destacado();
      if (indice < 0) return;
      this.elementos()[indice]?.nativeElement.scrollIntoView({ block: "nearest" });
    });
  }

  focus(): void {
    this.disparador().nativeElement.focus();
  }

  protected alEscribir(texto: string): void {
    this.vaciado.set(false);
    this.value.set(texto);
    this.consulta.set(texto);
    this.destacado.set(-1);
    if (!this.capa.abierto() && this.sugerencias().length) this.capa.abrir();
  }

  protected alPulsar(): void {
    if (this.bloqueado() || this.capa.abierto()) return;
    this.desplegar();
  }

  protected alPulsarTecla(event: KeyboardEvent): void {
    if (this.bloqueado()) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (this.capa.abierto()) {
          if (!event.altKey) this.mover(1);
          return;
        }
        this.desplegar();
        if (!event.altKey) this.mover(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (event.altKey) {
          this.capa.cerrar();
          return;
        }
        if (!this.capa.abierto()) this.desplegar();
        this.mover(-1);
        return;
      case "Enter": {
        const fila = this.filas()[this.destacado()];
        if (!fila) return;
        event.preventDefault();
        this.elegir(fila.opcion);
        return;
      }
      case "Escape":
        this.capa.alPulsarTecla(event);
        return;
      default:
        return;
    }
  }

  protected elegir(opcion: ComboboxOption): void {
    if (opcion.disabled) return;
    this.vaciado.set(false);
    this.value.set(opcion.label);
    this.picked.emit(opcion);
    this.capa.cerrar();
  }

  protected alPerderElFoco(): void {
    this.focused.set(false);
    this.touch.emit();
  }

  private desplegar(): void {
    this.consulta.set("");
    this.destacado.set(-1);
    this.vaciado.set(this.clearOnOpen());
    this.capa.abrir();
  }

  private mover(paso: number): void {
    const total = this.filas().length;
    if (!total) return;
    const actual = this.destacado();
    const partida = actual < 0 ? (paso > 0 ? 0 : total - 1) : actual + paso;
    this.destacado.set(this.primeraElegible(partida, paso, total));
  }

  private primeraElegible(desde: number, paso: number, total: number): number {
    const filas = this.filas();
    for (let n = 0; n < total; n++) {
      const indice = (((desde + paso * n) % total) + total) % total;
      if (!filas[indice]?.opcion.disabled) return indice;
    }
    return -1;
  }
}
