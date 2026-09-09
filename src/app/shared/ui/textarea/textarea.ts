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

let nextId = 0;

@Component({
  selector: "app-textarea",
  imports: [FieldShell],
  templateUrl: "./textarea.html",
  styleUrl: "./textarea.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Textarea implements FormValueControl<string> {
  readonly value = model("");

  readonly label = input("");
  readonly labelMode = input<LabelMode>("top");
  readonly placeholder = input("");
  readonly rows = input(4);
  readonly hint = input("");

  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly touched = input(false);
  readonly name = input("");

  readonly touch = output<void>();

  private readonly control =
    viewChild.required<ElementRef<HTMLTextAreaElement>>("control");

  protected readonly id = `app-textarea-${nextId++}`;
  protected readonly focused = signal(false);

  protected readonly floated = computed(() => this.focused() || this.value() !== "");

  protected readonly visiblePlaceholder = computed(() =>
    this.labelMode() === "float" && !this.floated() ? "" : this.placeholder(),
  );

  protected readonly error = computed(() =>
    this.touched() ? this.errors()[0]?.message : undefined,
  );

  protected readonly describedBy = computed(() =>
    this.error() || this.hint() ? `${this.id}-msg` : null,
  );

  focus(): void {
    this.control().nativeElement.focus();
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.touch.emit();
  }
}
