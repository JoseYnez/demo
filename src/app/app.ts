import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
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
  protected readonly themes = inject(ThemeService);
}
