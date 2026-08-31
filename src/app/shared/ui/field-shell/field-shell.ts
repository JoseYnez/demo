import { ChangeDetectionStrategy, Component, input } from "@angular/core";

export type LabelMode = "top" | "float" | "inset";

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
