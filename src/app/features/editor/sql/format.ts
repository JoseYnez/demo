import { formatDialect } from "sql-formatter";

import type { SqlDialect } from "../../../shared/ui";
import { DIALECTOS } from "./dialects";

export function formatearSql(texto: string, dialecto: SqlDialect): string {
  const info = DIALECTOS.find((d) => d.id === dialecto);
  if (!info) {
    throw new Error(`Dialecto desconocido: ${dialecto}`);
  }
  return formatDialect(texto, {
    dialect: info.formato,
    keywordCase: "upper",
    tabWidth: 2,
  });
}
