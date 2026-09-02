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

import { FieldShell, LabelMode } from "../field-shell/field-shell";

export type InputType = "text" | "email" | "password" | "search" | "tel" | "url";

const AVISO_BLOQ_MAYUS = "Bloq Mayús está activado.";

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
  readonly autocomplete = input("");
  readonly revealable = input(false);

  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly touched = input(false);
  readonly name = input("");

  readonly touch = output<void>();

  private readonly control = viewChild.required<ElementRef<HTMLInputElement>>("control");

  protected readonly id = `app-input-${nextId++}`;
  protected readonly focused = signal(false);
  protected readonly revealed = signal(false);
  protected readonly capsLock = signal(false);

  protected readonly floated = computed(() => this.focused() || this.value() !== "");

  protected readonly visiblePlaceholder = computed(() =>
    this.labelMode() === "float" && !this.floated() ? "" : this.placeholder(),
  );

  protected readonly error = computed(() =>
    this.touched() ? this.errors()[0]?.message : undefined,
  );

  protected readonly isPassword = computed(() => this.type() === "password");

  protected readonly showReveal = computed(() => this.isPassword() && this.revealable());

  protected readonly effectiveType = computed(() =>
    this.isPassword() && this.revealed() ? "text" : this.type(),
  );

  protected readonly help = computed(() =>
    this.isPassword() && this.capsLock() ? AVISO_BLOQ_MAYUS : this.hint(),
  );

  focus(): void {
    this.control().nativeElement.focus();
  }

  protected toggleReveal(): void {
    this.revealed.update((revealed) => !revealed);
  }

  protected onKey(event: KeyboardEvent): void {
    if (this.isPassword()) {
      this.capsLock.set(event.getModifierState("CapsLock"));
    }
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.capsLock.set(false);
    this.touch.emit();
  }
}
