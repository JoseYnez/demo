import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from "@angular/core";
import { FormValueControl, ValidationError } from "@angular/forms/signals";

import { FieldShell, idDelMensaje, LabelMode } from "../field-shell/field-shell";

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

let nextId = 0;

@Component({
  selector: "app-select",
  imports: [FieldShell],
  templateUrl: "./select.html",
  styleUrl: "./select.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Select implements FormValueControl<string> {
  readonly value = model("");

  readonly label = input("");
  readonly labelMode = input<LabelMode>("top");
  readonly options = input.required<readonly SelectOption[]>();
  readonly placeholder = input("");
  readonly hint = input("");

  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly touched = input(false);
  readonly name = input("");

  readonly touch = output<void>();

  protected readonly id = `app-select-${nextId++}`;

  protected readonly floated = computed(() => this.labelMode() === "float");

  protected readonly error = computed(() =>
    this.touched() ? this.errors()[0]?.message : undefined,
  );

  protected readonly describedBy = computed(() =>
    this.error() || this.hint() ? idDelMensaje(this.id) : null,
  );
}
