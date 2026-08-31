import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from "@angular/core";
import { FormValueControl, ValidationError } from "@angular/forms/signals";

import { FieldShell, LabelMode } from "../field-shell/field-shell";

export type InputType = "text" | "email" | "password" | "search" | "tel" | "url";

let nextId = 0;

@Component({
  selector: "app-input",
  imports: [FieldShell],
  templateUrl: "./input.html",
  styleUrl: "./input.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Input implements FormValueControl<string> {
  readonly value = model("");

  readonly label = input("");
  readonly labelMode = input<LabelMode>("top");
  readonly placeholder = input("");
  readonly type = input<InputType>("text");
  readonly hint = input("");

  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly touched = input(false);
  readonly name = input("");

  readonly touch = output<void>();

  protected readonly id = `app-input-${nextId++}`;
  protected readonly focused = signal(false);

  protected readonly floated = computed(() => this.focused() || this.value() !== "");

  protected readonly visiblePlaceholder = computed(() =>
    this.labelMode() === "float" && !this.floated() ? "" : this.placeholder(),
  );

  protected readonly error = computed(() =>
    this.touched() ? this.errors()[0]?.message : undefined,
  );

  protected onBlur(): void {
    this.focused.set(false);
    this.touch.emit();
  }
}
