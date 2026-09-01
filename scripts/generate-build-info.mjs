// @ts-check
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const salida = join(raiz, "src", "app", "core", "build-info.ts");

/** @param {string} argumentos */
function git(argumentos) {
  try {
    return execSync(`git ${argumentos}`, {
      cwd: raiz,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const { version } = JSON.parse(
  readFileSync(join(raiz, "package.json"), "utf8"),
);
const commit = git("rev-parse HEAD") || "desconocido";
const commitCorto = git("rev-parse --short HEAD") || "desconocido";

const contenido = `// Generado por scripts/generate-build-info.mjs antes de cada start/build/test — no editar a mano.

export const APP_VERSION: string = ${JSON.stringify(version)};

export const GIT_COMMIT: string = ${JSON.stringify(commit)};

export const GIT_COMMIT_SHORT: string = ${JSON.stringify(commitCorto)};
`;

writeFileSync(salida, contenido, "utf8");

console.log(`build-info.ts → v${version} · ${commitCorto}`);
