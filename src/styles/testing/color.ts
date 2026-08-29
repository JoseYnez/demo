/* Conversión OKLCH → sRGB y contraste WCAG 2 para los specs de tokens.
   Sólo lo consumen los tests: la app no deriva colores en runtime — la
   derivación vive en tokens.css como expresiones oklch(). */

export interface OklchValue {
  readonly l: number;
  readonly c: number;
  /** Alfa en [0,1]; 1 si la expresión no lo declara. */
  readonly alpha: number;
}

export function oklchToLinearRgb(
  l: number,
  c: number,
  hueDeg: number,
): readonly [number, number, number] {
  const hue = (hueDeg * Math.PI) / 180;
  const a = c * Math.cos(hue);
  const b = c * Math.sin(hue);
  const lm = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sm = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * lm - 3.3077115913 * mm + 0.2309699292 * sm,
    -1.2684380046 * lm + 2.6097574011 * mm - 0.3413193965 * sm,
    -0.0041960863 * lm - 0.7034186147 * mm + 1.707614701 * sm,
  ];
}

/** ¿Cabe en sRGB sin recorte? Tolerancia de 0.002 por el redondeo a 8 bits. */
export function inSrgbGamut(l: number, c: number, hueDeg: number): boolean {
  return oklchToLinearRgb(l, c, hueDeg).every((v) => v >= -0.002 && v <= 1.002);
}

export function oklchToHex(l: number, c: number, hueDeg: number): string {
  return (
    "#" +
    oklchToLinearRgb(l, c, hueDeg)
      .map((v) => Math.round(clamp01(gammaEncode(v)) * 255))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function hexToLinearRgb(hex: string): readonly [number, number, number] {
  const channel = (i: number) =>
    gammaDecode(parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255);
  return [channel(0), channel(1), channel(2)];
}

export function relativeLuminance(rgb: readonly [number, number, number]): number {
  const [r, g, b] = rgb.map(clamp01);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function luminanceOfHex(hex: string): number {
  return relativeLuminance(hexToLinearRgb(hex));
}

export function luminanceOfOklch(l: number, c: number, hueDeg: number): number {
  return relativeLuminance(oklchToLinearRgb(l, c, hueDeg));
}

export function contrastRatio(lumA: number, lumB: number): number {
  return (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05);
}

/** Mezcla `over` con opacidad `alpha` sobre `under`, por canal y en espacio
    gamma — igual que compone el navegador un color translúcido. */
export function compositeHex(overHex: string, alpha: number, underHex: string): string {
  const channel = (i: number) => {
    const over = parseInt(overHex.slice(1 + i * 2, 3 + i * 2), 16);
    const under = parseInt(underHex.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.round(alpha * over + (1 - alpha) * under);
  };
  return "#" + [0, 1, 2].map((i) => channel(i).toString(16).padStart(2, "0")).join("");
}

const OKLCH_EXPR =
  /oklch\(\s*([\d.]+)\s+([\d.]+)\s+var\(--accent-hue(?:,\s*[\d.]+)?\)\s*(?:\/\s*([\d.]+)%)?\s*\)/;

/** Extrae la primera expresión `oklch(L C var(--accent-hue[, def])[ / A%])`
    de un valor CSS (vale también para valores compuestos como --ring-focus).
    El tono no se devuelve: siempre lo sustituye el test. */
export function parseOklchValue(value: string): OklchValue | null {
  const m = OKLCH_EXPR.exec(value);
  if (!m) return null;
  return {
    l: Number(m[1]),
    c: Number(m[2]),
    alpha: m[3] === undefined ? 1 : Number(m[3]) / 100,
  };
}

function gammaEncode(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function gammaDecode(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
