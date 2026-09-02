import { ComponentFixture, TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it } from "vitest";

import { ConfirmDialog } from "./confirm-dialog";

describe("ConfirmDialog", () => {
  let fixture: ComponentFixture<ConfirmDialog>;
  let emitidos: string[];

  async function montar(
    entradas: Record<string, unknown> = {},
  ): Promise<void> {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(ConfirmDialog);
    fixture.componentRef.setInput("heading", "¿Eliminar a Ada Lovelace?");
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    emitidos = [];
    fixture.componentInstance.confirmed.subscribe(() =>
      emitidos.push("confirmed"),
    );
    fixture.componentInstance.dismissed.subscribe(() =>
      emitidos.push("dismissed"),
    );
    await fixture.whenStable();
  }

  const dialogo = (): HTMLDialogElement =>
    (fixture.nativeElement as HTMLElement).querySelector("dialog")!;

  const boton = (clase: string): HTMLButtonElement =>
    dialogo().querySelector<HTMLButtonElement>(`.${clase} button`)!;

  async function abrir(): Promise<void> {
    fixture.componentRef.setInput("open", true);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await montar();
  });

  it("no se abre hasta que se lo piden", () => {
    expect(dialogo().open).toBe(false);
  });

  it("abre y cierra siguiendo a la entrada", async () => {
    await abrir();
    expect(dialogo().open).toBe(true);

    fixture.componentRef.setInput("open", false);
    await fixture.whenStable();
    expect(dialogo().open).toBe(false);
  });

  it("confirmar y cancelar avisan al que abrió", async () => {
    await abrir();

    boton("cd__confirmar").click();
    boton("cd__cancelar").click();

    expect(emitidos).toEqual(["confirmed", "dismissed"]);
  });

  it("el Esc pide cerrar, no cierra por su cuenta", async () => {
    await abrir();

    dialogo().dispatchEvent(new Event("cancel", { cancelable: true }));
    await fixture.whenStable();

    expect(emitidos).toEqual(["dismissed"]);
    expect(dialogo().open).toBe(true);
  });

  it("el Esc dentro del diálogo pide cerrar aunque el motor no avise", async () => {
    await abrir();

    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    boton("cd__confirmar").dispatchEvent(escape);
    await fixture.whenStable();

    expect(emitidos).toEqual(["dismissed"]);
    expect(escape.defaultPrevented).toBe(true);
  });

  it("no pide cerrar dos veces si llegan el Esc y el aviso del motor", async () => {
    await abrir();

    fixture.componentInstance.dismissed.subscribe(() =>
      fixture.componentRef.setInput("open", false),
    );
    boton("cd__confirmar").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    dialogo().dispatchEvent(new Event("cancel", { cancelable: true }));
    await fixture.whenStable();

    expect(emitidos).toEqual(["dismissed"]);
  });

  it("mientras la acción trabaja no se puede cancelar", async () => {
    await montar({ busy: true });
    await abrir();

    boton("cd__cancelar").click();
    dialogo().dispatchEvent(new Event("cancel", { cancelable: true }));
    await fixture.whenStable();

    expect(emitidos).toEqual([]);
  });

  it("en la variante destructiva el foco arranca en cancelar", async () => {
    await montar({ variant: "danger" });
    await abrir();

    expect(document.activeElement).toBe(boton("cd__cancelar"));
  });

  it("en la variante normal el foco arranca en confirmar", async () => {
    await abrir();

    expect(document.activeElement).toBe(boton("cd__confirmar"));
  });
});
