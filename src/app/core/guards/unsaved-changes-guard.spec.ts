import { TestBed } from "@angular/core/testing";
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  type CanDeactivateFn,
} from "@angular/router";
import { describe, expect, it } from "vitest";

import { unsavedChangesGuard, type PuedeSalir } from "./unsaved-changes-guard";

function correr(
  componente: PuedeSalir,
): ReturnType<CanDeactivateFn<PuedeSalir>> {
  const vacio = {} as ActivatedRouteSnapshot;
  const estado = {} as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() =>
    unsavedChangesGuard(componente, vacio, estado, estado),
  );
}

describe("unsavedChangesGuard", () => {
  it("deja salir cuando el componente dice que sí", () => {
    expect(correr({ puedeSalir: () => true })).toBe(true);
  });

  it("retiene cuando el componente dice que no", () => {
    expect(correr({ puedeSalir: () => false })).toBe(false);
  });

  it("espera la decisión cuando el componente la aplaza", async () => {
    let decidir!: (salir: boolean) => void;
    const espera = new Promise<boolean>((resolve) => {
      decidir = resolve;
    });

    const resultado = correr({ puedeSalir: () => espera });
    decidir(true);

    await expect(resultado).resolves.toBe(true);
  });
});
