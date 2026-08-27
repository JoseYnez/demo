import { ChangeDetectionStrategy, Component, signal } from "@angular/core";

import { Button, Card, Input } from "../../shared/ui";
import { greetApi } from "../../tauri";

@Component({
  selector: "app-tauri-demo",
  imports: [Button, Card, Input],
  templateUrl: "./tauri-demo.html",
  styleUrl: "./tauri-demo.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TauriDemo {
  protected readonly name = signal("");
  protected readonly greeting = signal("");
  protected readonly error = signal("");
  protected readonly pending = signal(false);

  protected async greet(): Promise<void> {
    this.pending.set(true);
    this.error.set("");
    try {
      this.greeting.set(await greetApi.greet(this.name()));
    } catch (e) {
      this.greeting.set("");
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.pending.set(false);
    }
  }
}
