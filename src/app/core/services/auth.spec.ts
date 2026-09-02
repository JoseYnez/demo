import { TestBed } from "@angular/core/testing";
import { invoke } from "@tauri-apps/api/core";

import { AuthService } from "./auth";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: () => false,
}));

const SESION = {
  username: "demo",
  displayName: "Cuenta de demostración",
  issuedAt: 1_700_000_000_000,
};

describe("AuthService", () => {
  let auth: AuthService;

  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    TestBed.resetTestingModule();
    auth = TestBed.inject(AuthService);
  });

  it("arranca sin sesión", () => {
    expect(auth.session()).toBeNull();
    expect(auth.authenticated()).toBe(false);
  });

  it("guarda la sesión que devuelve el backend", async () => {
    vi.mocked(invoke).mockResolvedValue(SESION);

    const sesion = await auth.login({ username: "demo", password: "demo1234" });

    expect(sesion).toEqual(SESION);
    expect(auth.session()).toEqual(SESION);
    expect(auth.authenticated()).toBe(true);
    expect(invoke).toHaveBeenCalledWith("login", {
      username: "demo",
      password: "demo1234",
    });
  });

  it("relanza el mensaje del backend sin el prefijo del wrapper", async () => {
    vi.mocked(invoke).mockRejectedValue("Usuario o contraseña incorrectos.");

    await expect(
      auth.login({ username: "demo", password: "mal" }),
    ).rejects.toThrow("Usuario o contraseña incorrectos.");
    expect(auth.authenticated()).toBe(false);
  });

  it("conserva el contexto cuando el fallo no viene del backend", async () => {
    vi.mocked(invoke).mockRejectedValue(new TypeError("sin Tauri"));

    await expect(
      auth.login({ username: "demo", password: "demo1234" }),
    ).rejects.toThrow("authApi.login: TypeError: sin Tauri");
  });

  it("un fallo tras una sesión válida la cierra", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(SESION);
    await auth.login({ username: "demo", password: "demo1234" });

    vi.mocked(invoke).mockRejectedValueOnce("Usuario o contraseña incorrectos.");
    await auth.login({ username: "demo", password: "mal" }).catch(() => undefined);

    expect(auth.authenticated()).toBe(false);
  });

  it("logout vacía la sesión", async () => {
    vi.mocked(invoke).mockResolvedValue(SESION);
    await auth.login({ username: "demo", password: "demo1234" });

    auth.logout();

    expect(auth.session()).toBeNull();
    expect(auth.authenticated()).toBe(false);
  });
});
