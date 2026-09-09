import { describe, expect, it } from "vitest";

import {
  esISO,
  esRangoValido,
  finDeMes,
  finDeSemana,
  formatearRango,
  hoyISO,
  inicioDeAno,
  inicioDeMes,
  inicioDeSemana,
  RANGOS_HABITUALES,
  sumarDias,
  sumarMeses,
} from "./date-range";

const HOY = "2026-09-09";

function preset(id: string) {
  const encontrado = RANGOS_HABITUALES.find((p) => p.id === id);
  if (!encontrado) throw new Error(`falta el preset ${id}`);
  return encontrado;
}

describe("hoyISO", () => {
  it("usa los componentes locales, no el día UTC", () => {
    const nocheDeAno = new Date(2026, 11, 31, 23, 30);
    expect(hoyISO(nocheDeAno)).toBe("2026-12-31");
  });

  it("rellena mes y día a dos cifras", () => {
    expect(hoyISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("esISO", () => {
  it("acepta una fecha real", () => {
    expect(esISO("2024-02-29")).toBe(true);
  });

  it("rechaza un día que no existe", () => {
    expect(esISO("2026-02-30")).toBe(false);
    expect(esISO("2026-13-01")).toBe(false);
  });

  it("rechaza lo que no tiene la forma", () => {
    expect(esISO("9/9/2026")).toBe(false);
    expect(esISO("")).toBe(false);
  });
});

describe("sumarDias", () => {
  it("cruza el mes", () => {
    expect(sumarDias("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("cruza el año hacia atrás", () => {
    expect(sumarDias("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("cuenta el 29 de febrero en un año bisiesto", () => {
    expect(sumarDias("2024-02-28", 1)).toBe("2024-02-29");
    expect(sumarDias("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("no se salta el día del cambio de hora", () => {
    expect(sumarDias("2026-03-28", 1)).toBe("2026-03-29");
    expect(sumarDias("2026-03-29", 1)).toBe("2026-03-30");
    expect(sumarDias("2026-10-24", 1)).toBe("2026-10-25");
    expect(sumarDias("2026-10-25", 1)).toBe("2026-10-26");
  });
});

describe("sumarMeses", () => {
  it("recorta al último día del mes destino", () => {
    expect(sumarMeses("2026-03-31", -1)).toBe("2026-02-28");
    expect(sumarMeses("2024-03-31", -1)).toBe("2024-02-29");
  });

  it("cruza el año", () => {
    expect(sumarMeses("2026-01-15", -1)).toBe("2025-12-15");
    expect(sumarMeses("2026-12-15", 1)).toBe("2027-01-15");
  });
});

describe("límites de semana, mes y año", () => {
  it("la semana empieza en lunes", () => {
    expect(inicioDeSemana("2026-09-09")).toBe("2026-09-07");
    expect(inicioDeSemana("2026-09-07")).toBe("2026-09-07");
    expect(finDeSemana("2026-09-09")).toBe("2026-09-13");
  });

  it("el domingo cierra su semana, no abre la siguiente", () => {
    expect(inicioDeSemana("2026-09-13")).toBe("2026-09-07");
  });

  it("el mes va del uno al último", () => {
    expect(inicioDeMes("2026-09-09")).toBe("2026-09-01");
    expect(finDeMes("2026-09-09")).toBe("2026-09-30");
    expect(finDeMes("2024-02-10")).toBe("2024-02-29");
  });

  it("el año va del uno de enero", () => {
    expect(inicioDeAno("2026-09-09")).toBe("2026-01-01");
  });
});

describe("RANGOS_HABITUALES", () => {
  it("no repite ids", () => {
    const ids = RANGOS_HABITUALES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("hoy y ayer son un solo día", () => {
    expect(preset("today").resolve(HOY)).toEqual({ from: HOY, to: HOY });
    expect(preset("yesterday").resolve(HOY)).toEqual({
      from: "2026-09-08",
      to: "2026-09-08",
    });
  });

  it("los últimos N días incluyen hoy", () => {
    expect(preset("last7").resolve(HOY)).toEqual({
      from: "2026-09-03",
      to: HOY,
    });
    expect(preset("last30").resolve(HOY)).toEqual({
      from: "2026-08-11",
      to: HOY,
    });
  });

  it("los periodos en curso terminan hoy, no en el futuro", () => {
    expect(preset("thisWeek").resolve(HOY)).toEqual({
      from: "2026-09-07",
      to: HOY,
    });
    expect(preset("thisMonth").resolve(HOY)).toEqual({
      from: "2026-09-01",
      to: HOY,
    });
    expect(preset("thisYear").resolve(HOY)).toEqual({
      from: "2026-01-01",
      to: HOY,
    });
  });

  it("el mes pasado sí está completo", () => {
    expect(preset("lastMonth").resolve(HOY)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("el mes pasado desde un 31 no se salta febrero", () => {
    expect(preset("lastMonth").resolve("2026-03-31")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("todos devuelven un rango válido", () => {
    for (const p of RANGOS_HABITUALES) {
      const { from, to } = p.resolve(HOY);
      expect(esRangoValido(from, to), p.id).toBe(true);
    }
  });
});

describe("esRangoValido", () => {
  it("acepta un rango de un solo día", () => {
    expect(esRangoValido(HOY, HOY)).toBe(true);
  });

  it("rechaza el orden invertido", () => {
    expect(esRangoValido("2026-09-10", "2026-09-09")).toBe(false);
  });

  it("rechaza lo que no es una fecha", () => {
    expect(esRangoValido("", HOY)).toBe(false);
  });
});

describe("formatearRango", () => {
  function veces(texto: string, trozo: string): number {
    return texto.split(trozo).length - 1;
  }

  it("no corre el día por la zona horaria", () => {
    expect(formatearRango({ from: "2026-01-01", to: "2026-01-01" })).toMatch(
      /^1\D+2026$/,
    );
  });

  it("un solo día no lleva separador", () => {
    const texto = formatearRango({ from: HOY, to: HOY });
    expect(texto).not.toContain("–");
    expect(texto).toContain("2026");
  });

  it("dentro del mismo mes no repite el mes ni el año", () => {
    const texto = formatearRango({ from: "2026-09-01", to: "2026-09-30" });
    expect(texto).toContain("–");
    expect(veces(texto, "2026")).toBe(1);
    expect(texto.startsWith("1 –")).toBe(true);
  });

  it("dentro del mismo año repite el mes pero no el año", () => {
    const texto = formatearRango({ from: "2026-09-01", to: "2026-10-03" });
    expect(veces(texto, "2026")).toBe(1);
    expect(texto).toContain("–");
  });

  it("entre años distintos escribe los dos completos", () => {
    const texto = formatearRango({ from: "2026-09-01", to: "2027-01-03" });
    expect(veces(texto, "2026")).toBe(1);
    expect(veces(texto, "2027")).toBe(1);
  });

  it("devuelve vacío si el rango no vale", () => {
    expect(formatearRango({ from: "2026-09-10", to: "2026-09-01" })).toBe("");
    expect(formatearRango({ from: "", to: "" })).toBe("");
  });
});
