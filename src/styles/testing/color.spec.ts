import {
  compositeHex,
  contrastRatio,
  inSrgbGamut,
  luminanceOfHex,
  luminanceOfOklch,
  oklchToHex,
  parseOklchValue,
} from "./color";

describe("oklchToHex", () => {
  it("reproduce la receta del acento en tonos conocidos", () => {
    expect(oklchToHex(0.525, 0.06, 158)).toBe("#4c755d");
    expect(oklchToHex(0.525, 0.06, 245)).toBe("#4c6e8b");
    expect(oklchToHex(0.8, 0.045, 35)).toBe("#d9b4aa");
  });

  it("resuelve los extremos acromáticos", () => {
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff");
    expect(oklchToHex(0, 0, 0)).toBe("#000000");
  });
});

describe("inSrgbGamut", () => {
  it("detecta el azul claro fuera de gamut que motivó el croma .014", () => {
    expect(inSrgbGamut(0.965, 0.017, 258)).toBe(false);
    expect(inSrgbGamut(0.965, 0.014, 258)).toBe(true);
  });
});

describe("luminancia y contraste", () => {
  it("da los extremos WCAG", () => {
    expect(luminanceOfHex("#ffffff")).toBeCloseTo(1, 5);
    expect(luminanceOfHex("#000000")).toBe(0);
    expect(contrastRatio(1, 0)).toBeCloseTo(21, 5);
  });

  it("coincide entre hex y oklch para el mismo color", () => {
    const viaHex = luminanceOfHex(oklchToHex(0.525, 0.06, 158));
    expect(luminanceOfOklch(0.525, 0.06, 158)).toBeCloseTo(viaHex, 3);
  });
});

describe("parseOklchValue", () => {
  it("lee una expresión simple", () => {
    expect(parseOklchValue("oklch(0.525 0.06 var(--accent-hue))")).toEqual({
      l: 0.525,
      c: 0.06,
      alpha: 1,
    });
  });

  it("lee el fallback del var y el alfa", () => {
    expect(parseOklchValue("oklch(0.8 0.045 var(--accent-hue, 158) / 22%)")).toEqual({
      l: 0.8,
      c: 0.045,
      alpha: 0.22,
    });
  });

  it("la extrae de un valor compuesto como --ring-focus", () => {
    const ring = "0 0 0 3px oklch(0.525 0.06 var(--accent-hue) / 25%)";
    expect(parseOklchValue(ring)).toEqual({ l: 0.525, c: 0.06, alpha: 0.25 });
  });

  it("devuelve null para valores sin oklch", () => {
    expect(parseOklchValue("#4c755d")).toBeNull();
    expect(parseOklchValue("0 0 0 3px rgb(76 117 93 / 25%)")).toBeNull();
  });
});

describe("compositeHex", () => {
  it("respeta los extremos de opacidad", () => {
    expect(compositeHex("#ff0000", 1, "#ffffff")).toBe("#ff0000");
    expect(compositeHex("#ff0000", 0, "#ffffff")).toBe("#ffffff");
  });

  it("mezcla por canal en espacio gamma", () => {
    expect(compositeHex("#000000", 0.5, "#ffffff")).toBe("#808080");
  });
});
