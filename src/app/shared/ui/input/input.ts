import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from "@angular/core";
import { FormValueControl, ValidationError } from "@angular/forms/signals";

export type InputType = "text" | "email" | "password" | "search" | "tel" | "url";

let nextId = 0;

@Component({
  selector: "app-input",
  templateUrl: "./input.html",
  styleUrl: "./input.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Input implements FormValueControl<string> {
  readonly value = model("");

  readonly label = input("");
  readonly placeholder = input("");
  readonly type = input<InputType>("text");
  readonly hint = input("");

  /* Los sincroniza la directiva `formField` cuando el control se liga a un
     campo; también se pueden pasar a mano en uso suelto. */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly touched = input(false);
  readonly name = input("");

  readonly touch = output<void>();

  protected readonly id = `app-input-${nextId++}`;

  /* El error sólo se muestra tras interactuar: enseñar "requerido" en un
     formulario recién abierto es hostil. */
  protected readonly error = computed(() =>
    this.touched() ? this.errors()[0]?.message : undefined,
  );
}
