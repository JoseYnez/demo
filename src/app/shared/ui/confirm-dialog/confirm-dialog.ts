import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from "@angular/core";

import { Button } from "../button/button";

export type ConfirmVariant = "primary" | "danger";

let nextId = 0;

@Component({
  selector: "app-confirm-dialog",
  imports: [Button],
  templateUrl: "./confirm-dialog.html",
  styleUrl: "./confirm-dialog.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly heading = input.required<string>();
  readonly detail = input("");
  readonly confirmLabel = input("Confirmar");
  readonly cancelLabel = input("Cancelar");
  readonly variant = input<ConfirmVariant>("primary");
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly dismissed = output<void>();

  private readonly caja =
    viewChild.required<ElementRef<HTMLDialogElement>>("caja");
  private readonly acciones =
    viewChild.required<ElementRef<HTMLElement>>("acciones");

  protected readonly id = `app-confirm-${nextId++}`;

  constructor() {
    effect(() => {
      const dialogo = this.caja().nativeElement;
      if (this.open() === dialogo.open) return;

      if (this.open()) {
        this.mostrar(dialogo);
        this.enfocarLoSeguro();
      } else {
        this.ocultar(dialogo);
      }
    });
  }

  protected confirmar(): void {
    this.confirmed.emit();
  }

  protected cancelar(): void {
    if (this.busy() || !this.open()) return;
    this.dismissed.emit();
  }

  protected alTeclear(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    this.cancelar();
  }

  protected alPedirCierre(event: Event): void {
    event.preventDefault();
    this.cancelar();
  }

  private mostrar(dialogo: HTMLDialogElement): void {
    if (typeof dialogo.showModal === "function") {
      dialogo.showModal();
      return;
    }
    dialogo.setAttribute("open", "");
  }

  private ocultar(dialogo: HTMLDialogElement): void {
    if (typeof dialogo.close === "function") {
      dialogo.close();
      return;
    }
    dialogo.removeAttribute("open");
  }

  private enfocarLoSeguro(): void {
    const seguro =
      this.variant() === "danger" ? ".cd__cancelar" : ".cd__confirmar";
    this.acciones()
      .nativeElement.querySelector<HTMLButtonElement>(`${seguro} button`)
      ?.focus();
  }
}
