import { CanDeactivateFn } from "@angular/router";

export interface PuedeSalir {
  puedeSalir(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<PuedeSalir> = (componente) =>
  componente.puedeSalir();
