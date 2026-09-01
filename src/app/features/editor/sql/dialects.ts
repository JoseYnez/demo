import {
  mysql,
  postgresql,
  sqlite,
  transactsql,
  type DialectOptions,
} from "sql-formatter";

import type { SqlDialect } from "../../../shared/ui";

export interface DialectoInfo {
  id: SqlDialect;
  etiqueta: string;
  formato: DialectOptions;
}

export const DIALECTOS: readonly DialectoInfo[] = [
  { id: "tsql", etiqueta: "T-SQL", formato: transactsql },
  { id: "postgresql", etiqueta: "PostgreSQL", formato: postgresql },
  { id: "mysql", etiqueta: "MySQL", formato: mysql },
  { id: "sqlite", etiqueta: "SQLite", formato: sqlite },
];
