import { Extension } from "@codemirror/state";
import { MSSQL, MySQL, PostgreSQL, SQLite, sql, SQLDialect } from "@codemirror/lang-sql";

export type EditorLanguage = "sql";
export type SqlDialect = "tsql" | "postgresql" | "mysql" | "sqlite";

const SQL_DIALECTS: Record<SqlDialect, SQLDialect> = {
  tsql: MSSQL,
  postgresql: PostgreSQL,
  mysql: MySQL,
  sqlite: SQLite,
};

export function languageExtension(
  language: EditorLanguage,
  dialect: SqlDialect,
): Extension {
  switch (language) {
    case "sql":
      return sql({ dialect: SQL_DIALECTS[dialect], upperCaseKeywords: true });
  }
}
