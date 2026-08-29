import { ChangeDetectionStrategy, Component, input } from "@angular/core";

export type LabelMode = "top" | "float" | "inset";

/**
 * Carcasa compartida por Input, Textarea y Select: etiqueta, muesca del borde
 * y línea de ayuda/error. El control nativo se proyecta dentro.
 *
 * En modo `float` el borde lo dibuja un `<fieldset>` y la muesca la abre su
 * `<legend>`. Es la única técnica que funciona con un control relleno: tapar el
 * borde con un parche de fondo dejaría un rectángulo visible sobre la página.
 * El fieldset es decorativo (`aria-hidden`); la etiqueta real sigue siendo el
 * `<label for>`.
 */
@Component({
  selector: "app-field-shell",
  templateUrl: "./field-shell.html",
  styleUrl: "./field-shell.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldShell {
  readonly labelMode = input<LabelMode>("top");
  readonly label = input("");
  readonly controlId = input.required<string>();
  readonly floated = input(false);
  readonly required = input(false);
  readonly disabled = input(false);
  readonly hint = input("");
  readonly error = input<string | undefined>(undefined);
}
