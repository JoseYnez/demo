import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
} from "@angular/core";

export type ToastVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

const FAMILIA: Record<ToastVariant, string> = {
  neutral: "Aviso",
  success: "Correcto",
  warning: "Atención",
  danger: "Error",
  info: "Información",
};

@Component({
  selector: "app-toast",
  templateUrl: "./toast.html",
  styleUrl: "./toast.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "(pointerenter)": "conPuntero(true)",
    "(pointerleave)": "conPuntero(false)",
    "(focusin)": "conFoco(true)",
    "(focusout)": "conFoco(false)",
  },
})
export class Toast {
  readonly variant = input<ToastVariant>("neutral");
  readonly heading = input("");
  readonly detail = input("");
  readonly duration = input(6000);

  readonly expired = output<void>();
  readonly closed = output<void>();

  protected readonly classes = computed(() => `toast toast--${this.variant()}`);
  protected readonly familia = computed(() => FAMILIA[this.variant()]);
  protected readonly cuentaAtras = computed(() => this.duration() > 0);

  #temporizador: ReturnType<typeof setTimeout> | null = null;
  #restante = 0;
  #desde = 0;
  #terminado = false;
  #puntero = false;
  #foco = false;

  constructor() {
    effect((onCleanup) => {
      const ms = this.duration();
      onCleanup(() => this.#detener());
      if (ms <= 0) return;
      this.#restante = ms;
      this.#terminado = false;
      this.#arrancar();
    });
  }

  protected conPuntero(dentro: boolean): void {
    this.#puntero = dentro;
    this.#sincronizar();
  }

  protected conFoco(dentro: boolean): void {
    this.#foco = dentro;
    this.#sincronizar();
  }

  #sincronizar(): void {
    if (this.duration() <= 0 || this.#terminado) return;
    if (this.#puntero || this.#foco) {
      this.#detener();
      return;
    }
    if (this.#temporizador !== null) return;
    this.#arrancar();
  }

  #arrancar(): void {
    if (this.#restante <= 0) {
      this.#terminado = true;
      this.expired.emit();
      return;
    }
    this.#desde = Date.now();
    this.#temporizador = setTimeout(() => {
      this.#temporizador = null;
      this.#restante = 0;
      this.#terminado = true;
      this.expired.emit();
    }, this.#restante);
  }

  #detener(): void {
    if (this.#temporizador === null) return;
    clearTimeout(this.#temporizador);
    this.#temporizador = null;
    this.#restante = Math.max(0, this.#restante - (Date.now() - this.#desde));
  }
}
