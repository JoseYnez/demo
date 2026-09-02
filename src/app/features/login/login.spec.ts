import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from "@angular/router";
import { invoke } from "@tauri-apps/api/core";

import { AuthService } from "../../core/services/auth";
import { Login } from "./login";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: () => false,
}));

const SESION = {
  username: "demo",
  displayName: "Cuenta de demostración",
  issuedAt: 1_700_000_000_000,
};

async function montar(volver?: string): Promise<ComponentFixture<Login>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [Login],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(volver ? { volver } : {}) },
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Login);
  await fixture.whenStable();
  return fixture;
}

function escribir(raiz: HTMLElement, indice: number, texto: string): void {
  const control = raiz.querySelectorAll("input")[indice];
  control.value = texto;
  control.dispatchEvent(new Event("input"));
}

async function enviar(fixture: ComponentFixture<Login>): Promise<void> {
  const raiz = fixture.nativeElement as HTMLElement;
  raiz.querySelector("form")?.dispatchEvent(new Event("submit", { cancelable: true }));
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

describe("Login", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("enfoca el usuario al abrirse", async () => {
    const fixture = await montar();
    const raiz = fixture.nativeElement as HTMLElement;

    expect(document.activeElement).toBe(raiz.querySelector("input"));
  });

  it("declara el autocompletado de credenciales para el gestor de contraseñas", async () => {
    const fixture = await montar();
    const [usuario, contrasena] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll("input"),
    );

    expect(usuario.getAttribute("autocomplete")).toBe("username");
    expect(contrasena.getAttribute("autocomplete")).toBe("current-password");
    expect(contrasena.type).toBe("password");
  });

  it("no llama al backend con el formulario vacío y señala los dos campos", async () => {
    const fixture = await montar();
    await enviar(fixture);

    const errores = (fixture.nativeElement as HTMLElement).querySelectorAll(".ui-msg--error");
    expect(Array.from(errores).map((e) => e.textContent?.trim())).toEqual([
      "Escribe tu usuario.",
      "Escribe tu contraseña.",
    ]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("muestra el rechazo del backend y lo retira al corregir", async () => {
    vi.mocked(invoke).mockRejectedValue("Usuario o contraseña incorrectos.");
    const fixture = await montar();
    const raiz = fixture.nativeElement as HTMLElement;

    escribir(raiz, 0, "demo");
    escribir(raiz, 1, "mal");
    await enviar(fixture);

    const aviso = raiz.querySelector(".login__error");
    expect(aviso?.getAttribute("role")).toBe("alert");
    expect(aviso?.textContent?.trim()).toBe("Usuario o contraseña incorrectos.");

    escribir(raiz, 1, "malo");
    await fixture.whenStable();
    expect(raiz.querySelector(".login__error")).toBeNull();
  });

  it("entra, guarda la sesión y vuelve a donde se quería ir", async () => {
    vi.mocked(invoke).mockResolvedValue(SESION);
    const fixture = await montar("/tauri-demo");
    const raiz = fixture.nativeElement as HTMLElement;
    const navegar = vi
      .spyOn(TestBed.inject(Router), "navigateByUrl")
      .mockResolvedValue(true);

    escribir(raiz, 0, "demo");
    escribir(raiz, 1, "demo1234");
    await enviar(fixture);

    expect(invoke).toHaveBeenCalledWith("login", {
      username: "demo",
      password: "demo1234",
    });
    expect(TestBed.inject(AuthService).session()).toEqual(SESION);
    expect(navegar).toHaveBeenCalledWith("/tauri-demo");
  });

  it("ignora un destino que no sea una ruta interna", async () => {
    vi.mocked(invoke).mockResolvedValue(SESION);
    const fixture = await montar("//evil.example");
    const raiz = fixture.nativeElement as HTMLElement;
    const navegar = vi
      .spyOn(TestBed.inject(Router), "navigateByUrl")
      .mockResolvedValue(true);

    escribir(raiz, 0, "demo");
    escribir(raiz, 1, "demo1234");
    await enviar(fixture);

    expect(navegar).toHaveBeenCalledWith("/");
  });

  it("con sesión iniciada ofrece cerrarla en vez del formulario", async () => {
    vi.mocked(invoke).mockResolvedValue(SESION);
    const fixture = await montar();
    const raiz = fixture.nativeElement as HTMLElement;
    vi.spyOn(TestBed.inject(Router), "navigateByUrl").mockResolvedValue(true);

    escribir(raiz, 0, "demo");
    escribir(raiz, 1, "demo1234");
    await enviar(fixture);

    expect(raiz.querySelector("form")).toBeNull();
    expect(raiz.querySelector(".login__activa")?.textContent).toContain(
      "Cuenta de demostración",
    );

    raiz.querySelector<HTMLButtonElement>(".login__acciones button")?.click();
    await fixture.whenStable();

    expect(TestBed.inject(AuthService).authenticated()).toBe(false);
    expect(raiz.querySelector("form")).not.toBeNull();
    expect(raiz.querySelector<HTMLInputElement>("input")?.value).toBe("");
  });
});
