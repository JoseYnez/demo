import type { SqlDialect } from "../shared/ui";

export type FinDeLinea = "lf" | "crlf";
export type Codificacion = "utf8" | "utf8bom" | "utf16le" | "utf16be";

export interface ArchivoTexto {
  contenido: string;
  eol: FinDeLinea;
  codificacion: Codificacion;
}

export interface Documento {
  id: string;
  ruta: string | null;
  nombre: string;
  sucio: boolean;
  eol: FinDeLinea;
  codificacion: Codificacion;
  dialecto: SqlDialect;
}
