import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from "@angular/core";

import { Documento } from "../../../models/documento.model";

@Component({
  selector: "app-document-tabs",
  templateUrl: "./document-tabs.html",
  styleUrl: "./document-tabs.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentTabs {
  readonly documentos = input.required<readonly Documento[]>();
  readonly activoId = input<string | null>(null);

  readonly seleccionar = output<string>();
  readonly cerrarPestana = output<string>();
  readonly crear = output<void>();
}
