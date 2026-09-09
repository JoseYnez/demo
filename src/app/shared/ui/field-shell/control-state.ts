import type { ValidationError } from "@angular/forms/signals";

import type { LabelMode } from "./field-shell";

let siguiente = 0;

export function idDeControl(prefijo: string): string {
  return `${prefijo}-${siguiente++}`;
}

export function idDelMensaje(id: string, hayMensaje: boolean): string | null {
  return hayMensaje ? `${id}-msg` : null;
}

export function primerError(
  touched: boolean,
  errors: readonly ValidationError.WithOptionalFieldTree[],
): string | undefined {
  return touched ? errors[0]?.message : undefined;
}

export function placeholderVisible(
  labelMode: LabelMode,
  floated: boolean,
  placeholder: string,
): string {
  return labelMode === "float" && !floated ? "" : placeholder;
}
