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

import {
  idDeControl,
  idDelMensaje,
  placeholderVisible,
  primerError,
} from "../field-shell/control-state";
import { FieldShell, LabelMode } from "../field-shell/field-shell";

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

  protected readonly id = idDeControl("app-textarea");
  protected readonly focused = signal(false);

  protected readonly floated = computed(() => this.focused() || this.value() !== "");

  protected readonly visiblePlaceholder = computed(() =>
    placeholderVisible(this.labelMode(), this.floated(), this.placeholder()),
  );

  protected readonly error = computed(() =>
    primerError(this.touched(), this.errors()),
  );

  protected readonly describedBy = computed(() =>
    idDelMensaje(this.id, !!this.error() || !!this.hint()),
  );

  focus(): void {
    this.control().nativeElement.focus();
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.touch.emit();
  }
}
