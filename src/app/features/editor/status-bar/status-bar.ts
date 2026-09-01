import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from "@angular/core";

import {
  Codificacion,
  Documento,
  FinDeLinea,
} from "../../../models/documento.model";
import type { CursorPosition, SqlDialect } from "../../../shared/ui";
import { DIALECTOS } from "../sql/dialects";

const EOL_ETIQUETAS: Record<FinDeLinea, string> = {
  lf: "LF",
  crlf: "CRLF",
};

const CODIFICACION_ETIQUETAS: Record<Codificacion, string> = {
  utf8: "UTF-8",
  utf8bom: "UTF-8 BOM",
  utf16le: "UTF-16 LE",
  utf16be: "UTF-16 BE",
};

@Component({
  selector: "app-status-bar",
  templateUrl: "./status-bar.html",
  styleUrl: "./status-bar.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBar {
  readonly documento = input.required<Documento | null>();
  readonly cursor = input.required<CursorPosition>();
  readonly mensaje = input<string | null>(null);

  readonly cambiarDialecto = output<SqlDialect>();

  protected readonly dialectos = DIALECTOS;

  protected alCambiarDialecto(event: Event): void {
    this.cambiarDialecto.emit(
      (event.target as HTMLSelectElement).value as SqlDialect,
    );
  }

  protected readonly eolEtiqueta = computed(() => {
    const doc = this.documento();
    return doc ? EOL_ETIQUETAS[doc.eol] : "";
  });

  protected readonly codificacionEtiqueta = computed(() => {
    const doc = this.documento();
    return doc ? CODIFICACION_ETIQUETAS[doc.codificacion] : "";
  });
}
