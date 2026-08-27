import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from "@angular/core";
import { FormValueControl, ValidationError } from "@angular/forms/signals";

let nextId = 0;

@Component({
  selector: "app-textarea",
  templateUrl: "./textarea.html",
  styleUrl: "./textarea.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Textarea implements FormValueControl<string> {
  readonly value = model("");

  readonly label = input("");
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

  protected readonly id = `app-textarea-${nextId++}`;

  protected readonly error = computed(() =>
    this.touched() ? this.errors()[0]?.message : undefined,
  );
}
