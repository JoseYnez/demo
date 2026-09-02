import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from "@angular/router";

import { AuthService } from "../services/auth";
import { authGuard } from "./auth-guard";

function ejecutar(url: string) {
  return TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
}

function configurar(authenticated: boolean): void {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { authenticated: signal(authenticated) } },
    ],
  });
}

describe("authGuard", () => {
  it("deja pasar con sesión iniciada", () => {
    configurar(true);
    expect(ejecutar("/tauri-demo")).toBe(true);
  });

  it("redirige al login guardando a dónde se quería ir", () => {
    configurar(false);
    const resultado = ejecutar("/tauri-demo");

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe(
      "/login?volver=%2Ftauri-demo",
    );
  });
});
