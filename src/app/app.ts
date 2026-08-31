import { ChangeDetectionStrategy, Component, DestroyRef, inject } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

import { ThemeService } from "./core/services/theme";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly themes = inject(ThemeService);

  constructor() {
    this.bloquearNavegacionAlSoltarArchivos();
  }

  private bloquearNavegacionAlSoltarArchivos(): void {
    const bloquear = (event: DragEvent) => event.preventDefault();
    document.addEventListener("dragover", bloquear);
    document.addEventListener("drop", bloquear);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener("dragover", bloquear);
      document.removeEventListener("drop", bloquear);
    });
  }
}
