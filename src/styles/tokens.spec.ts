import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  compositeHex,
  contrastRatio,
  inSrgbGamut,
  luminanceOfHex,
  luminanceOfOklch,
  oklchToHex,
  parseOklchValue,
} from "./testing/color";

const css = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");

/* ---------- parsing ---------- */

// El comentario del bloque de acento menciona "@supports" a secas; la regla
// real es la única con "(color:".
const supportsIdx = css.indexOf("@supports (color:");
if (supportsIdx < 0) throw new Error("No se encontró el bloque @supports del acento");
const baseCss = css.slice(0, supportsIdx);
const supportsCss = css.slice(supportsIdx);

function extractBlock(source: string, selector: RegExp): string {
  const m = selector.exec(source);
  if (!m) throw new Error(`No se encontró el bloque ${selector}`);
  const start = source.indexOf("{", m.index) + 1;
  let depth = 1;
  let i = start;
  while (depth > 0 && i < source.length) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
    i++;
  }
  return source.slice(start, i - 1);
}

function decls(body: string): Record<string, string> {
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]),
  );
}

const ROOT = /:root \{/;
const DARK_ATTR = /:root\[data-theme="dark"\] \{/;
const DARK_MEDIA = /:root:not\(\[data-theme="light"\]\) \{/;

const light = decls(extractBlock(baseCss, ROOT));
const darkAttr = decls(extractBlock(baseCss, DARK_ATTR));
const darkMedia = decls(extractBlock(baseCss, DARK_MEDIA));
const accentLight = decls(extractBlock(supportsCss, ROOT));
const accentDarkAttr = decls(extractBlock(supportsCss, DARK_ATTR));
const accentDarkMedia = decls(extractBlock(supportsCss, DARK_MEDIA));

/* ---------- resolución por cascada ----------

   Orden real del navegador: los bloques [data-theme] (0,2,0) ganan a los
   :root (0,1,0) estén donde estén, y a igual especificidad gana el último
   del archivo — los del @supports. */

type Scope = Record<string, string>;
const CASCADA_CLARO: readonly Scope[] = [accentLight, light];
const CASCADA_OSCURO: readonly Scope[] = [accentDarkAttr, darkAttr, accentLight, light];

function rawOf(scopes: readonly Scope[], token: string): string {
  let current = token;
  for (let hops = 0; hops < 5; hops++) {
    const scope = scopes.find((s) => current in s);
    if (!scope) throw new Error(`Token desconocido: ${current}`);
    const value = scope[current];
    if (!value.startsWith("var(")) return value;
    current = value.slice(4, -1).trim();
  }
  throw new Error(`Cadena de var() demasiado profunda desde ${token}`);
}

function hexAt(scopes: readonly Scope[], token: string, hue: number): string {
  const raw = rawOf(scopes, token);
  const oklch = parseOklchValue(raw);
  return oklch ? oklchToHex(oklch.l, oklch.c, hue) : raw;
}

function lumAt(scopes: readonly Scope[], token: string, hue: number): number {
  const raw = rawOf(scopes, token);
  const oklch = parseOklchValue(raw);
  return oklch ? luminanceOfOklch(oklch.l, oklch.c, hue) : luminanceOfHex(raw);
}

const DEFAULT_HUE = 158;
const HUES = Array.from({ length: 72 }, (_, i) => i * 5);

const SURFACES = ["--bg-app", "--bg-surface", "--bg-surface-alt", "--bg-surface-raised"];

/** [texto, mínimo WCAG]. 4.5 = AA texto normal, 3.0 = AA componentes de interfaz. */
const SOBRE_TODA_SUPERFICIE: readonly [string, number][] = [
  ["--text-primary", 7.0],
  ["--text-secondary", 4.5],
  ["--text-muted", 4.5],
];

interface Par {
  fg: string;
  bg: string;
  min: number;
}

/** Pares del acento: giran con el tono, así que el barrido los verifica
    en los 72 tonos, hover y active incluidos. `--accent` va contra TODAS las
    superficies, no sólo la principal: el badge `outline` no tiene relleno y su
    texto cae directamente sobre la superficie que lo aloje. */
const PARES_ACENTO: readonly Par[] = [
  ...SURFACES.map((bg) => ({ fg: "--accent", bg, min: 4.5 })),
  { fg: "--accent", bg: "--accent-subtle", min: 4.5 },
  { fg: "--text-on-accent", bg: "--accent", min: 4.5 },
  { fg: "--text-on-accent", bg: "--accent-hover", min: 4.5 },
  { fg: "--text-on-accent", bg: "--accent-active", min: 4.5 },
  { fg: "--color-neutral-on-solid", bg: "--color-neutral-solid", min: 4.5 },
];

const FAMILIAS_SEMANTICAS = ["success", "warning", "danger", "info"] as const;

/** Pares semánticos: no giran, se comprueban sólo sobre los bloques hex.
    `fg` sobre `bg` es el badge tenue; `on-solid` sobre `solid`, el relleno;
    y `fg` sobre cada superficie, el `outline`, que se queda sin fondo propio. */
const PARES_SEMANTICOS: readonly Par[] = FAMILIAS_SEMANTICAS.flatMap((f) => [
  { fg: `--color-${f}-fg`, bg: `--color-${f}-bg`, min: 4.5 },
  { fg: `--color-${f}-on-solid`, bg: `--color-${f}-solid`, min: 4.5 },
  ...SURFACES.map((bg) => ({ fg: `--color-${f}-fg`, bg, min: 4.5 })),
]);

/* Los controles son outlined: el borde es su único indicador, así que debe
   cumplir el 3:1 de WCAG 1.4.11 contra CUALQUIER superficie sobre la que
   pueda caer, no sólo la principal. */
const PARES_BORDE: readonly Par[] = SURFACES.map((bg) => ({
  fg: "--border-strong",
  bg,
  min: 3.0,
}));

function paresDeBarrido(): readonly Par[] {
  return [
    ...SURFACES.flatMap((bg) =>
      SOBRE_TODA_SUPERFICIE.map(([fg, min]) => ({ fg, bg, min })),
    ),
    ...PARES_BORDE,
    ...PARES_ACENTO,
  ];
}

/** Compone el anillo de foco (translúcido) sobre el fondo que tenga detrás y
    devuelve el hex resultante. La etiqueta flotante cae justo encima del
    anillo, así que su contraste real NO es contra la página sino contra esta
    mezcla — ahí se coló el fallo original: texto de acento sobre halo de
    acento daba 3.84:1. */
function ringOver(scopes: readonly Scope[], bgToken: string, hue: number): string {
  const raw = rawOf(scopes, "--ring-focus");
  const oklch = parseOklchValue(raw);
  if (oklch) {
    return compositeHex(oklchToHex(oklch.l, oklch.c, hue), oklch.alpha, hexAt(scopes, bgToken, hue));
  }
  const m = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*\/\s*(\d+)%\s*\)/.exec(raw);
  if (!m) throw new Error(`No se pudo leer --ring-focus: ${raw}`);
  const hex =
    "#" + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, "0")).join("");
  return compositeHex(hex, Number(m[4]) / 100, hexAt(scopes, bgToken, hue));
}

function maxChannelDelta(hexA: string, hexB: string): number {
  return Math.max(
    ...[0, 1, 2].map((i) =>
      Math.abs(
        parseInt(hexA.slice(1 + i * 2, 3 + i * 2), 16) -
          parseInt(hexB.slice(1 + i * 2, 3 + i * 2), 16),
      ),
    ),
  );
}

/* ---------- tests ---------- */

describe("tokens.css", () => {
  it("mantiene los dos bloques oscuros estáticos idénticos", () => {
    expect(Object.keys(darkAttr).sort()).toEqual(Object.keys(darkMedia).sort());
    expect(darkAttr).toEqual(darkMedia);
  });

  it("mantiene los dos bloques oscuros del @supports idénticos", () => {
    expect(Object.keys(accentDarkAttr).sort()).toEqual(Object.keys(accentDarkMedia).sort());
    expect(accentDarkAttr).toEqual(accentDarkMedia);
  });

  /* Ancla: los fallbacks hex son el render exacto de las expresiones oklch a
     tono 158. Si alguien retoca un lado y no el otro, esto lo caza. */
  for (const [nombre, accentScope, hexScope] of [
    ["claro", accentLight, light],
    ["oscuro", accentDarkAttr, darkAttr],
  ] as const) {
    describe(`ancla hex↔oklch (${nombre})`, () => {
      for (const token of Object.keys(accentScope)) {
        it(`${token} coincide a tono ${DEFAULT_HUE}`, () => {
          const oklch = parseOklchValue(accentScope[token]);
          if (!oklch) throw new Error(`${token} no es una expresión oklch`);
          const rendered = oklchToHex(oklch.l, oklch.c, DEFAULT_HUE);
          const fallback = hexScope[token];
          if (token === "--ring-focus") {
            const m = /rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*(\d+)%\s*\)/.exec(fallback);
            if (!m) throw new Error(`Fallback del anillo ilegible: ${fallback}`);
            const fallbackHex =
              "#" + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, "0")).join("");
            expect(maxChannelDelta(rendered, fallbackHex)).toBeLessThanOrEqual(1);
            expect(Number(m[4]) / 100).toBe(oklch.alpha);
          } else {
            expect(maxChannelDelta(rendered, fallback)).toBeLessThanOrEqual(1);
          }
        });
      }
    });
  }

  /* Paleta estática (motores sin oklch): los pares completos a tono 158. */
  for (const [tema, scopes] of [
    ["claro", [light] as readonly Scope[]],
    ["oscuro", [darkAttr, light] as readonly Scope[]],
  ] as const) {
    describe(`tema ${tema} (fallback estático)`, () => {
      for (const par of [...paresDeBarrido(), ...PARES_SEMANTICOS]) {
        it(`${par.fg} sobre ${par.bg} cumple ${par.min}:1`, () => {
          const ratio = contrastRatio(
            lumAt(scopes, par.fg, DEFAULT_HUE),
            lumAt(scopes, par.bg, DEFAULT_HUE),
          );
          expect(ratio).toBeGreaterThanOrEqual(par.min);
        });
      }

      for (const surface of ["--bg-app", "--bg-surface"]) {
        it(`el anillo de foco deja leer texto encima en ${surface}`, () => {
          const ratio = contrastRatio(
            lumAt(scopes, "--text-primary", DEFAULT_HUE),
            luminanceOfHex(ringOver(scopes, surface, DEFAULT_HUE)),
          );
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
      }
    });
  }

  /* Barrido: el tono es del usuario, así que cada par debe aguantar en los
     72 tonos muestreados. Este test ES el diseño del acento configurable —
     si pasa, no existe color elegible que rompa la app. */
  for (const [tema, scopes] of [
    ["claro", CASCADA_CLARO],
    ["oscuro", CASCADA_OSCURO],
  ] as const) {
    describe(`tema ${tema} (barrido de tonos)`, () => {
      for (const par of paresDeBarrido()) {
        it(`${par.fg} sobre ${par.bg} cumple ${par.min}:1 en todo tono`, () => {
          const peor = Math.min(
            ...HUES.map((hue) =>
              contrastRatio(lumAt(scopes, par.fg, hue), lumAt(scopes, par.bg, hue)),
            ),
          );
          expect(peor).toBeGreaterThanOrEqual(par.min);
        });
      }

      for (const surface of ["--bg-app", "--bg-surface"]) {
        it(`el anillo deja leer texto encima en ${surface} en todo tono`, () => {
          const peor = Math.min(
            ...HUES.map((hue) =>
              contrastRatio(
                lumAt(scopes, "--text-primary", hue),
                luminanceOfHex(ringOver(scopes, surface, hue)),
              ),
            ),
          );
          expect(peor).toBeGreaterThanOrEqual(4.5);
        });
      }
    });
  }

  /* Gamut: ninguna expresión puede salirse de sRGB en ningún tono — un color
     recortado por el motor invalidaría el contraste calculado aquí. */
  for (const [nombre, scope] of [
    ["claro", accentLight],
    ["oscuro", accentDarkAttr],
  ] as const) {
    it(`las expresiones oklch del bloque ${nombre} caben en sRGB en todo tono`, () => {
      for (const [token, value] of Object.entries(scope)) {
        const oklch = parseOklchValue(value);
        if (!oklch) throw new Error(`${token} no es una expresión oklch`);
        for (const hue of HUES) {
          expect(
            inSrgbGamut(oklch.l, oklch.c, hue),
            `${token} fuera de gamut en H=${hue}`,
          ).toBe(true);
        }
      }
    });
  }
});
