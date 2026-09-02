import { ComponentFixture, TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it } from "vitest";

import type { AppNotification } from "../../../models/notification.model";
import { NotificationPanel } from "./notification-panel";

describe("NotificationPanel", () => {
  let fixture: ComponentFixture<NotificationPanel>;
  let descartados: string[];
  let vaciados: number;

  const aviso = (parcial: Partial<AppNotification> = {}): AppNotification => ({
    id: "n1",
    variant: "neutral",
    title: "Aviso",
    createdAt: Date.now(),
    duration: 6000,
    read: false,
    ...parcial,
  });

  async function montar(items: readonly AppNotification[]): Promise<void> {
    fixture = TestBed.createComponent(NotificationPanel);
    fixture.componentRef.setInput("items", items);
    descartados = [];
    vaciados = 0;
    fixture.componentInstance.dismissed.subscribe((id) => descartados.push(id));
    fixture.componentInstance.cleared.subscribe(() => vaciados++);
    await fixture.whenStable();
  }

  const caja = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const filas = (): HTMLElement[] =>
    Array.from(caja().querySelectorAll<HTMLElement>(".np__fila"));

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it("sin avisos enseña el hueco y esconde el vaciar", async () => {
    await montar([]);

    expect(caja().querySelector(".np__hueco")).not.toBeNull();
    expect(caja().querySelector(".np__lista")).toBeNull();
    expect(caja().querySelector(".np__vaciar")).toBeNull();
  });

  it("pinta una fila por aviso y marca las que están sin leer", async () => {
    await montar([
      aviso({ id: "n2", title: "Nueva" }),
      aviso({ id: "n1", title: "Vista", read: true }),
    ]);

    expect(filas()).toHaveLength(2);
    expect(filas()[0].classList).toContain("is-unread");
    expect(filas()[1].classList).not.toContain("is-unread");
  });

  it("anuncia la familia y el estado a quien no ve el punto", async () => {
    await montar([aviso({ variant: "danger", title: "Falló" })]);

    expect(caja().querySelector(".np__familia")?.textContent).toBe(
      "Error, sin leer:",
    );
  });

  it("cuenta el tiempo desde que llegó", async () => {
    await montar([
      aviso({ id: "n1", createdAt: Date.now() - 5 * 60_000 }),
      aviso({ id: "n2", createdAt: Date.now() - 3 * 60 * 60_000 }),
      aviso({ id: "n3", createdAt: Date.now() - 2000 }),
    ]);

    const tiempos = Array.from(
      caja().querySelectorAll(".np__tiempo"),
      (nodo) => nodo.textContent?.trim(),
    );
    expect(tiempos).toEqual(["hace 5 min", "hace 3 h", "ahora"]);
  });

  it("descarta el aviso que le toca y vacía la lista entera", async () => {
    await montar([aviso({ id: "n7", title: "Uno" })]);

    caja().querySelector<HTMLButtonElement>(".np__descartar")!.click();
    expect(descartados).toEqual(["n7"]);

    caja().querySelector<HTMLButtonElement>(".np__vaciar")!.click();
    expect(vaciados).toBe(1);
  });
});
