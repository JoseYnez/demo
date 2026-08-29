import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from "@angular/core";
import { FormValueControl, ValidationError } from "@angular/forms/signals";

import { FieldShell, LabelMode } from "../field-shell/field-shell";

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

  /* Un select siempre muestra algo —el placeholder o la opción elegida—, así
     que en float la etiqueta vive arriba desde el principio. */
  protected readonly floated = computed(() => this.labelMode() === "float");

  protected readonly error = computed(() =>
    this.touched() ? this.errors()[0]?.message : undefined,
  );
}
