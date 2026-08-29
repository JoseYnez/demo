import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");

function block(selector: RegExp): Record<string, string> {
  const m = selector.exec(css);
  if (!m) throw new Error(`No se encontró el bloque ${selector}`);
  const body = css.slice(m.index + m[0].length).split("\n}")[0];
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]),
  );
}

const light = block(/:root \{/);
const darkAttr = block(/:root\[data-theme="dark"\] \{/);
const darkMedia = block(/:root:not\(\[data-theme="light"\]\) \{/);

function resolve(scope: Record<string, string>, token: string): string {
  const raw = scope[token] ?? light[token];
  if (!raw) throw new Error(`Token desconocido: ${token}`);
  return raw.startsWith("var(") ? resolve(scope, raw.slice(4, -1).trim()) : raw;
}

function luminance(hex: string): number {
  const to = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * to(0) + 0.7152 * to(1) + 0.0722 * to(2);
}

function contrast(scope: Record<string, string>, fg: string, bg: string): number {
  const a = luminance(resolve(scope, fg));
  const b = luminance(resolve(scope, bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

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

const PARES: readonly Par[] = [
  { fg: "--accent", bg: "--bg-surface", min: 4.5 },
  { fg: "--accent", bg: "--accent-subtle", min: 4.5 },
  { fg: "--text-on-accent", bg: "--accent", min: 4.5 },
  { fg: "--color-danger-on-solid", bg: "--color-danger-solid", min: 4.5 },
  { fg: "--color-success-fg", bg: "--color-success-bg", min: 4.5 },
  { fg: "--color-warning-fg", bg: "--color-warning-bg", min: 4.5 },
  { fg: "--color-danger-fg", bg: "--color-danger-bg", min: 4.5 },
  { fg: "--color-info-fg", bg: "--color-info-bg", min: 4.5 },

  // Los controles son outlined: el borde es su único indicador, así que debe
  // cumplir el 3:1 de WCAG 1.4.11 contra CUALQUIER superficie sobre la que
  // pueda caer, no sólo la principal.
  { fg: "--border-strong", bg: "--bg-app", min: 3.0 },
  { fg: "--border-strong", bg: "--bg-surface", min: 3.0 },
  { fg: "--border-strong", bg: "--bg-surface-alt", min: 3.0 },
  { fg: "--border-strong", bg: "--bg-surface-raised", min: 3.0 },
];

/**
 * Compone el anillo de foco (translúcido) sobre el fondo que tenga detrás.
 * La etiqueta flotante cae justo encima del anillo, así que su contraste real
 * NO es contra la página sino contra esta mezcla — que es donde se coló el
 * fallo: texto de acento sobre halo de acento daba 3.84:1.
 */
function ringOver(scope: Record<string, string>, bgToken: string): string {
  const ring = resolve(scope, "--ring-focus");
  const m = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*\/\s*(\d+)%\s*\)/.exec(ring);
  if (!m) throw new Error(`No se pudo leer --ring-focus: ${ring}`);
  const alpha = Number(m[4]) / 100;
  const bg = resolve(scope, bgToken);
  const channel = (i: number) => {
    const over = Number(m[i + 1]);
    const under = parseInt(bg.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.round(alpha * over + (1 - alpha) * under);
  };
  return "#" + [0, 1, 2].map((i) => channel(i).toString(16).padStart(2, "0")).join("");
}

describe("tokens.css", () => {
  it("mantiene los dos bloques oscuros idénticos", () => {
    expect(Object.keys(darkAttr).sort()).toEqual(Object.keys(darkMedia).sort());
    expect(darkAttr).toEqual(darkMedia);
  });

  for (const [tema, scope] of [
    ["claro", light],
    ["oscuro", darkAttr],
  ] as const) {
    describe(`tema ${tema}`, () => {
      for (const [texto, min] of SOBRE_TODA_SUPERFICIE) {
        for (const surface of SURFACES) {
          it(`${texto} sobre ${surface} cumple ${min}:1`, () => {
            expect(contrast(scope, texto, surface)).toBeGreaterThanOrEqual(min);
          });
        }
      }

      for (const par of PARES) {
        it(`${par.fg} sobre ${par.bg} cumple ${par.min}:1`, () => {
          expect(contrast(scope, par.fg, par.bg)).toBeGreaterThanOrEqual(par.min);
        });
      }

      // Margen de seguridad: el anillo no debe volverse tan opaco que el texto
      // que caiga encima deje de leerse. Hoy la etiqueta flotante se tapa el
      // anillo con su propio parche (`--field-bg`), pero lo cruza al animarse,
      // y este umbral evita repetir el fallo original —etiqueta de acento
      // sobre halo de acento, 3.84:1— si alguien sube la opacidad.
      for (const surface of ["--bg-app", "--bg-surface"]) {
        it(`el anillo de foco deja leer texto encima en ${surface}`, () => {
          const bajoElAnillo = ringOver(scope, surface);
          const label = resolve(scope, "--text-primary");
          const a = luminance(label);
          const b = luminance(bajoElAnillo);
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
      }
    });
  }
});
