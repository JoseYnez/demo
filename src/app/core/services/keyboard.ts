import { DestroyRef, Service, inject } from "@angular/core";

export interface Shortcut {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly description?: string;
  readonly preventDefault?: boolean;
}

export type RegisteredShortcut = Readonly<Shortcut>;

const TECLAS_DE_FUNCION = /^F([1-9]|1[0-9]|2[0-4])$/;

interface Binding extends Shortcut {
  readonly run: () => void;
}

@Service()
export class KeyboardService {
  private readonly bindings: Binding[] = [];

  constructor() {
    const escuchar = (event: KeyboardEvent) => this.despachar(event);
    window.addEventListener("keydown", escuchar);
    inject(DestroyRef).onDestroy(() =>
      window.removeEventListener("keydown", escuchar),
    );
  }

  register(
    shortcut: Shortcut,
    run: () => void,
    destroyRef = inject(DestroyRef),
  ): () => void {
    const binding: Binding = { ...shortcut, run };
    this.bindings.push(binding);

    const soltar = () => {
      const indice = this.bindings.indexOf(binding);
      if (indice !== -1) {
        this.bindings.splice(indice, 1);
      }
    };
    const olvidarLaBaja = destroyRef.onDestroy(soltar);

    return () => {
      olvidarLaBaja();
      soltar();
    };
  }

  list(): readonly RegisteredShortcut[] {
    return [...this.bindings].reverse().map(({ run, ...shortcut }) => shortcut);
  }

  private despachar(event: KeyboardEvent): void {
    if (this.puedeEscribir(event) && this.esCampoEditable(event.target)) {
      return;
    }
    for (let i = this.bindings.length - 1; i >= 0; i--) {
      const binding = this.bindings[i];
      if (this.coincide(binding, event)) {
        if (binding.preventDefault !== false) {
          event.preventDefault();
        }
        binding.run();
        return;
      }
    }
  }

  private coincide(binding: Binding, event: KeyboardEvent): boolean {
    return (
      event.key.toLowerCase() === binding.key.toLowerCase() &&
      (event.ctrlKey || event.metaKey) === !!binding.ctrl &&
      event.shiftKey === !!binding.shift &&
      event.altKey === !!binding.alt
    );
  }

  private puedeEscribir(event: KeyboardEvent): boolean {
    return !TECLAS_DE_FUNCION.test(event.key);
  }

  private esCampoEditable(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const etiqueta = target.tagName;
    return (
      etiqueta === "INPUT" ||
      etiqueta === "TEXTAREA" ||
      etiqueta === "SELECT" ||
      target.isContentEditable
    );
  }
}
