import { describe, expect, it } from "vitest";

import { formatearSql } from "./format";

describe("formatearSql", () => {
  it("formatea T-SQL con las palabras clave en mayúsculas", () => {
    const salida = formatearSql(
      "select top 5 nombre from dbo.cliente where id > 3 order by nombre",
      "tsql",
    );

    expect(salida).toContain("SELECT");
    expect(salida).toContain("TOP 5");
    expect(salida).toContain("ORDER BY");
    expect(salida.split("\n").length).toBeGreaterThan(1);
  });

  it("respeta el dialecto pedido", () => {
    const salida = formatearSql("select 1 limit 3", "postgresql");

    expect(salida).toContain("LIMIT");
  });

  it("lanza cuando el SQL no se puede analizar", () => {
    expect(() => formatearSql("SELECT 'sin cerrar", "tsql")).toThrow();
  });
});
