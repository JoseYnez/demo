import { describe, expect, it } from "vitest";

import {
  filtrarSugerencias,
  partirCoincidencia,
  plegarTexto,
  type ComboboxOption,
} from "./suggestions";

const CIUDADES: readonly ComboboxOption[] = [
  { label: "Ávila", detail: "Castilla y León" },
  { label: "Madrid", detail: "Comunidad de Madrid" },
  { label: "Málaga", detail: "Andalucía" },
  { label: "Teruel", detail: "Aragón", disabled: true },
];

describe("plegarTexto", () => {
  it("quita las tildes y baja a minúsculas", () => {
    expect(plegarTexto("Ávila")).toBe("avila");
    expect(plegarTexto("MÁLAGA")).toBe("malaga");
  });

  it("pliega la eñe a ene, como cualquier buscador", () => {
    expect(plegarTexto("Añón")).toBe("anon");
  });
});

describe("filtrarSugerencias", () => {
  it("devuelve todo con la consulta vacía", () => {
    expect(filtrarSugerencias(CIUDADES, "")).toHaveLength(4);
    expect(filtrarSugerencias(CIUDADES, "   ")).toHaveLength(4);
  });

  it("encuentra sin tildes y sin mayúsculas", () => {
    expect(filtrarSugerencias(CIUDADES, "avila").map((o) => o.label)).toEqual(["Ávila"]);
    expect(filtrarSugerencias(CIUDADES, "MAL").map((o) => o.label)).toEqual(["Málaga"]);
  });

  it("busca por subcadena, no sólo por prefijo", () => {
    expect(filtrarSugerencias(CIUDADES, "rid").map((o) => o.label)).toEqual(["Madrid"]);
  });

  it("busca también en el detalle", () => {
    expect(filtrarSugerencias(CIUDADES, "andalucia").map((o) => o.label)).toEqual(["Málaga"]);
  });

  it("conserva las deshabilitadas, que se ven pero no se eligen", () => {
    expect(filtrarSugerencias(CIUDADES, "teruel").map((o) => o.label)).toEqual(["Teruel"]);
  });
});

describe("partirCoincidencia", () => {
  it("parte el texto en los tres trozos", () => {
    expect(partirCoincidencia("Madrid", "dri")).toEqual({
      antes: "Ma",
      coincide: "dri",
      despues: "d",
    });
  });

  it("devuelve el texto entero sin consulta", () => {
    expect(partirCoincidencia("Madrid", "")).toEqual({
      antes: "Madrid",
      coincide: "",
      despues: "",
    });
  });

  it("devuelve el texto entero cuando no hay coincidencia", () => {
    expect(partirCoincidencia("Madrid", "zzz")).toEqual({
      antes: "Madrid",
      coincide: "",
      despues: "",
    });
  });

  it("resalta el original con tilde aunque se buscara sin ella", () => {
    expect(partirCoincidencia("Ávila", "avi")).toEqual({
      antes: "",
      coincide: "Ávi",
      despues: "la",
    });
  });

  it("no descoloca el resaltado cuando plegar cambia la longitud", () => {
    const texto = "Ávila";
    expect(plegarTexto(texto)).toBe("avila");
    expect(plegarTexto(texto).length).toBeLessThan(texto.length);
    expect(partirCoincidencia(texto, "avi")).toEqual({
      antes: "",
      coincide: "Ávi",
      despues: "la",
    });
    expect(partirCoincidencia(texto, "vila").antes).toBe("Á");
  });
});
