import { ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toast } from "./toast";

describe("Toast", () => {
  let fixture: ComponentFixture<Toast>;
  let emitidos: string[];

  function montar(duration: number): void {
    fixture = TestBed.createComponent(Toast);
    fixture.componentRef.setInput("heading", "Guardado");
    fixture.componentRef.setInput("duration", duration);
    emitidos = [];
    fixture.componentInstance.expired.subscribe(() => emitidos.push("expired"));
    fixture.componentInstance.closed.subscribe(() => emitidos.push("closed"));
    fixture.detectChanges();
  }

  const caja = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const entraElPuntero = () =>
    caja().dispatchEvent(new PointerEvent("pointerenter"));
  const saleElPuntero = () =>
    caja().dispatchEvent(new PointerEvent("pointerleave"));
  const entraElFoco = () =>
    caja().dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("se retira solo justo al cumplirse la duración", () => {
    montar(6000);

    vi.advanceTimersByTime(5999);
    expect(emitidos).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(emitidos).toEqual(["expired"]);
  });

  it("con duración cero se queda hasta que lo cierren", () => {
    montar(0);

    vi.advanceTimersByTime(60_000);

    expect(emitidos).toEqual([]);
    expect(caja().querySelector(".toast__bar")).toBeNull();
  });

  it("el puntero encima congela la cuenta y sólo gasta lo que quedaba", () => {
    montar(6000);

    vi.advanceTimersByTime(4000);
    entraElPuntero();
    vi.advanceTimersByTime(60_000);
    expect(emitidos).toEqual([]);

    saleElPuntero();
    vi.advanceTimersByTime(1999);
    expect(emitidos).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(emitidos).toEqual(["expired"]);
  });

  it("el foco dentro congela la cuenta aunque el puntero se vaya", () => {
    montar(6000);

    entraElPuntero();
    entraElFoco();
    saleElPuntero();
    vi.advanceTimersByTime(60_000);

    expect(emitidos).toEqual([]);
  });

  it("la aspa lo cierra a mano y no lo da por expirado", () => {
    montar(6000);

    caja().querySelector<HTMLButtonElement>(".toast__close")!.click();

    expect(emitidos).toEqual(["closed"]);
  });

  it("no deja el temporizador vivo al destruirse", () => {
    montar(6000);

    fixture.destroy();
    vi.advanceTimersByTime(60_000);

    expect(emitidos).toEqual([]);
  });
});
