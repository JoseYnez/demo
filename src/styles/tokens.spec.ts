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
  /** Mínimo distinto en oscuro, sólo donde el tema se desvía a propósito. */
  minOscuro?: number;
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

  // DESVIACIÓN CONSCIENTE. WCAG 1.4.11 pide 3:1 para el límite de un control.
  // El tema claro lo cumple. El oscuro copia el peso de borde de ChatGPT, que
  // es más suave, y baja a 2.2:1 — decisión estética explícita del usuario.
  // Se compensa con relleno propio (`--bg-surface-alt`) y un anillo de foco
  // fuerte, pero el borde en reposo NO cumple 1.4.11. Subir este número a 3.0
  // devuelve el cumplimiento a costa del look.
  { fg: "--border-strong", bg: "--bg-surface", min: 3.0, minOscuro: 2.2 },
];

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
        const min = tema === "oscuro" ? (par.minOscuro ?? par.min) : par.min;
        it(`${par.fg} sobre ${par.bg} cumple ${min}:1`, () => {
          expect(contrast(scope, par.fg, par.bg)).toBeGreaterThanOrEqual(min);
        });
      }
    });
  }
});
