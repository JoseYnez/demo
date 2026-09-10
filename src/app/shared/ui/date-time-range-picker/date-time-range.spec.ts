import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ahoraUTC,
  aInstante,
  aLocal,
  esInstante,
  esRangoConHoraValido,
  finDeDiaLocal,
  finDeMesLocal,
  formatearRangoConHora,
  inicioDeDiaLocal,
  inicioDeMesLocal,
  inicioDeSemanaLocal,
  RANGOS_HABITUALES_CON_HORA,
  sumarDiasLocal,
  sumarHoras,
  sumarMinutos,
  type DateTimeRangePreset,
} from "./date-time-range";

const ZONA = "Europe/Madrid";

function preset(id: string): DateTimeRangePreset {
  const encontrado = RANGOS_HABITUALES_CON_HORA.find((p) => p.id === id);
  if (!encontrado) throw new Error(`no hay preset ${id}`);
  return encontrado;
}

function horasEntre(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
}

describe("date-time-range", () => {
  const original = Intl.DateTimeFormat().resolvedOptions().timeZone;

  beforeAll(() => {
    process.env["TZ"] = ZONA;
  });

  afterAll(() => {
    process.env["TZ"] = original;
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(original);
  });

  it("la zona del equipo es la que fija el spec", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(ZONA);
  });

  describe("forma del instante", () => {
    it("acepta el formato canónico", () => {
      expect(esInstante("2026-09-09T08:00:00Z")).toBe(true);
    });

    it("rechaza lo que no lleve Z, segundos en cero o minutos", () => {
      expect(esInstante("2026-09-09T08:00Z")).toBe(false);
      expect(esInstante("2026-09-09T08:00:30Z")).toBe(false);
      expect(esInstante("2026-09-09T08:00:00+02:00")).toBe(false);
      expect(esInstante("2026-09-09")).toBe(false);
    });

    it("rechaza un día que no existe", () => {
      expect(esInstante("2026-02-30T08:00:00Z")).toBe(false);
    });

    it("ahoraUTC recorta al minuto en vez de redondear", () => {
      expect(ahoraUTC(new Date("2026-09-09T08:00:59.999Z"))).toBe(
        "2026-09-09T08:00:00Z",
      );
    });

    it("dos instantes se ordenan comparando las cadenas", () => {
      expect("2026-09-09T08:00:00Z" < "2026-09-09T08:30:00Z").toBe(true);
      expect(esRangoConHoraValido("2026-09-09T08:00:00Z", "2026-09-09T07:00:00Z")).toBe(
        false,
      );
    });
  });

  describe("conversión con la zona del equipo", () => {
    it("pinta el instante en hora local, y cambia con la estación", () => {
      expect(aLocal("2026-09-09T08:00:00Z")).toBe("2026-09-09T10:00");
      expect(aLocal("2026-01-09T08:00:00Z")).toBe("2026-01-09T09:00");
    });

    it("la ida y la vuelta no mueven el instante", () => {
      const instante = "2026-09-09T08:00:00Z";
      expect(aInstante(aLocal(instante))).toBe(instante);
    });

    it("rechaza el texto que no es una hora local completa", () => {
      expect(aInstante("2026-09-09")).toBe("");
      expect(aInstante("2026-09-09T10:00:00Z")).toBe("");
      expect(aInstante("")).toBe("");
    });

    it("rechaza un día que no existe en vez de correrlo al mes siguiente", () => {
      expect(aInstante("2026-02-30T10:00")).toBe("");
    });
  });

  describe("cambio de hora", () => {
    it("la hora local que no existe se empuja hacia adelante", () => {
      const instante = aInstante("2026-03-29T02:30");
      expect(instante).toBe("2026-03-29T01:30:00Z");
      expect(aLocal(instante)).toBe("2026-03-29T03:30");
    });

    it("la hora local ambigua se resuelve por la primera ocurrencia", () => {
      expect(aInstante("2026-10-25T02:30")).toBe("2026-10-25T00:30:00Z");
    });

    it("sumar horas cuenta horas reales, no de calendario", () => {
      const arranque = "2026-03-29T00:30:00Z";
      expect(aLocal(arranque)).toBe("2026-03-29T01:30");
      expect(aLocal(sumarHoras(arranque, 2))).toBe("2026-03-29T04:30");
    });

    it("sumar días locales conserva la hora civil aunque el día dure 23", () => {
      const vispera = aInstante("2026-03-28T12:00");
      const siguiente = sumarDiasLocal(vispera, 1);
      expect(aLocal(siguiente)).toBe("2026-03-29T12:00");
      expect(horasEntre(vispera, siguiente)).toBe(23);
    });

    it("el inicio del día es la medianoche local, no las 00:00Z", () => {
      expect(inicioDeDiaLocal("2026-09-09T08:00:00Z")).toBe("2026-09-08T22:00:00Z");
      expect(aLocal(inicioDeDiaLocal("2026-09-09T08:00:00Z"))).toBe(
        "2026-09-09T00:00",
      );
    });
  });

  describe("fronteras civiles locales", () => {
    const jueves = "2026-09-10T12:00:00Z";

    it("el fin del día es el último minuto local", () => {
      expect(aLocal(finDeDiaLocal(jueves))).toBe("2026-09-10T23:59");
    });

    it("la semana empieza en lunes", () => {
      expect(aLocal(inicioDeSemanaLocal(jueves))).toBe("2026-09-07T00:00");
    });

    it("el mes va del día uno al último, a medianoche y al último minuto", () => {
      expect(aLocal(inicioDeMesLocal(jueves))).toBe("2026-09-01T00:00");
      expect(aLocal(finDeMesLocal(jueves))).toBe("2026-09-30T23:59");
    });

    it("febrero de un bisiesto termina el 29", () => {
      expect(aLocal(finDeMesLocal("2028-02-10T12:00:00Z"))).toBe("2028-02-29T23:59");
    });

    it("sumar días locales cruza el fin de mes", () => {
      expect(aLocal(sumarDiasLocal("2026-09-30T12:00:00Z", 1))).toBe(
        "2026-10-01T14:00",
      );
    });
  });

  describe("rangos de fábrica", () => {
    const ahora = aInstante("2026-09-10T15:30");

    it("las duraciones son exactas y terminan ahora", () => {
      expect(preset("last15m").resolve(ahora)).toEqual({
        from: sumarMinutos(ahora, -15),
        to: ahora,
      });
      expect(horasEntre(preset("last24h").resolve(ahora).from, ahora)).toBe(24);
    });

    it("las últimas 24 h siguen siendo 24 horas reales el día del cambio", () => {
      const traselCambio = aInstante("2026-03-29T12:00");
      const { from, to } = preset("last24h").resolve(traselCambio);
      expect(horasEntre(from, to)).toBe(24);
      expect(aLocal(from)).toBe("2026-03-28T11:00");
    });

    it("hoy empieza a medianoche local y termina ahora", () => {
      const { from, to } = preset("today").resolve(ahora);
      expect(aLocal(from)).toBe("2026-09-10T00:00");
      expect(to).toBe(ahora);
    });

    it("ayer está cerrado de punta a punta", () => {
      const { from, to } = preset("yesterday").resolve(ahora);
      expect(aLocal(from)).toBe("2026-09-09T00:00");
      expect(aLocal(to)).toBe("2026-09-09T23:59");
    });

    it("los últimos 7 días arrancan seis días antes, a medianoche", () => {
      const { from, to } = preset("last7").resolve(ahora);
      expect(aLocal(from)).toBe("2026-09-04T00:00");
      expect(to).toBe(ahora);
    });

    it("la semana y el mes en curso terminan ahora, no al final del periodo", () => {
      expect(preset("thisWeek").resolve(ahora).to).toBe(ahora);
      expect(preset("thisMonth").resolve(ahora).to).toBe(ahora);
      expect(aLocal(preset("thisMonth").resolve(ahora).from)).toBe(
        "2026-09-01T00:00",
      );
    });

    it("todos devuelven un rango válido", () => {
      for (const p of RANGOS_HABITUALES_CON_HORA) {
        const { from, to } = p.resolve(ahora);
        expect(esRangoConHoraValido(from, to)).toBe(true);
      }
    });
  });

  describe("formateo", () => {
    it("colapsa el día cuando el rango no lo cruza", () => {
      expect(
        formatearRangoConHora({
          from: "2026-09-09T06:00:00Z",
          to: "2026-09-09T15:30:00Z",
        }),
      ).toBe("9 sept 2026, 08:00 – 17:30");
    });

    it("repite la fecha cuando el rango cruza el día", () => {
      expect(
        formatearRangoConHora({
          from: "2026-09-09T06:00:00Z",
          to: "2026-09-10T15:30:00Z",
        }),
      ).toBe("9 sept 2026, 08:00 – 10 sept 2026, 17:30");
    });

    it("el día que colapsa es el local, no el UTC", () => {
      expect(
        formatearRangoConHora({
          from: "2026-09-08T22:30:00Z",
          to: "2026-09-09T10:00:00Z",
        }),
      ).toBe("9 sept 2026, 00:30 – 12:00");
    });

    it("un rango inválido no se formatea", () => {
      expect(
        formatearRangoConHora({ from: "2026-09-09T08:00:00Z", to: "nada" }),
      ).toBe("");
    });
  });
});
