import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();

const indexHtml = readFileSync(join(raiz, "src/index.html"), "utf8");
const tauriConf = JSON.parse(
  readFileSync(join(raiz, "src-tauri/tauri.conf.json"), "utf8"),
) as { app: { security: { csp: string | null } } };

const csp = tauriConf.app.security.csp ?? "";

function hashDelScriptAntiDestello(): string {
  const m = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/.exec(indexHtml);
  if (!m) throw new Error("No hay script inline en index.html");
  return `sha256-${createHash("sha256").update(m[1], "utf8").digest("base64")}`;
}

describe("CSP de producción", () => {
  it("declara una política, no la deja en null", () => {
    expect(csp).not.toBe("");
  });

  it("autoriza el script anti-destello por su hash", () => {
    expect(csp).toContain(`'${hashDelScriptAntiDestello()}'`);
  });

  it("deja pasar lo que la app necesita de verdad", () => {
    expect(csp).toContain("blob:");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("ipc:");
  });

  it("cierra lo que la app no usa", () => {
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("no pone política en desarrollo, donde vive el websocket de Vite", () => {
    expect(tauriConf.app.security).not.toHaveProperty("devCsp");
  });
});
