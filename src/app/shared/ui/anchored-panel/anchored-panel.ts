import {
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  type Signal,
} from "@angular/core";

export interface AnchoredPanelOptions {
  readonly disparador: Signal<ElementRef<HTMLElement> | undefined>;
  readonly panel: Signal<ElementRef<HTMLElement> | undefined>;
  readonly enfocarElPanel?: boolean;
  readonly alAbrir?: () => void;
  readonly alCerrar?: () => void;
}

interface ZonaVisible {
  readonly top: number;
  readonly bottom: number;
  readonly right: number;
}

export class AnchoredPanel {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly #abierto = signal(false);
  readonly #arriba = signal(false);
  readonly #aLaDerecha = signal(false);

  readonly abierto = this.#abierto.asReadonly();
  readonly arriba = this.#arriba.asReadonly();
  readonly aLaDerecha = this.#aLaDerecha.asReadonly();

  readonly #opciones: AnchoredPanelOptions;

  constructor(opciones: AnchoredPanelOptions) {
    this.#opciones = opciones;

    effect(() => {
      const panel = this.#opciones.panel()?.nativeElement;
      if (!panel) return;
      untracked(() => {
        if (this.#opciones.enfocarElPanel !== false) {
          panel.focus({ preventScroll: true });
        }
        this.#colocar(panel);
      });
    });

    effect((alLimpiar) => {
      if (!this.#abierto()) return;
      const alPulsarFuera = (event: PointerEvent) => {
        const destino = event.target;
        if (destino instanceof Node && this.#host.nativeElement.contains(destino)) {
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

  abrir(): void {
    if (this.#abierto()) return;
    this.#arriba.set(false);
    this.#aLaDerecha.set(false);
    this.#opciones.alAbrir?.();
    this.#abierto.set(true);
  }

  cerrar(devolverElFoco = true): void {
    if (!this.#abierto()) return;
    this.#abierto.set(false);
    this.#opciones.alCerrar?.();
    if (devolverElFoco) {
      this.#opciones.disparador()?.nativeElement.focus();
    }
  }

  alternar(): void {
    if (this.#abierto()) {
      this.cerrar();
      return;
    }
    this.abrir();
  }

  alPulsarTecla(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !this.#abierto()) return;
    event.preventDefault();
    event.stopPropagation();
    this.cerrar();
  }

  alSalirElFoco(event: FocusEvent): void {
    const siguiente = event.relatedTarget;
    if (!(siguiente instanceof Node)) return;
    if (this.#host.nativeElement.contains(siguiente)) return;
    this.cerrar(false);
  }

  #colocar(panel: HTMLElement): void {
    const caja = panel.getBoundingClientRect();
    if (caja.height === 0) return;
    const anclaje = this.#opciones.disparador()?.nativeElement;
    if (!anclaje) return;
    const disparador = anclaje.getBoundingClientRect();
    const zona = this.#zonaVisible();
    const hueco = caja.top - disparador.bottom;
    const cabeDebajo = caja.bottom <= zona.bottom;
    const cabeEncima = disparador.top - hueco - caja.height >= zona.top;
    this.#arriba.set(!cabeDebajo && cabeEncima);
    this.#aLaDerecha.set(caja.right > zona.right);
    if (!cabeDebajo && !cabeEncima) {
      panel.scrollIntoView({ block: "nearest" });
    }
  }

  #zonaVisible(): ZonaVisible {
    const raiz = document.documentElement;
    const zona = { top: 0, bottom: raiz.clientHeight, right: raiz.clientWidth };
    for (let el = this.#host.nativeElement.parentElement; el; el = el.parentElement) {
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
