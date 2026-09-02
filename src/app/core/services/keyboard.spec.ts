import { Component, DestroyRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { KeyboardService } from "./keyboard";

function pulsar(
  init: KeyboardEventInit,
  destino: EventTarget = document.body,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  destino.dispatchEvent(event);
  return event;
}

describe("KeyboardService", () => {
  let teclado: KeyboardService;
  let destroyRef: DestroyRef;

  beforeEach(() => {
    TestBed.resetTestingModule();
    teclado = TestBed.inject(KeyboardService);
    destroyRef = TestBed.inject(DestroyRef);
  });

  it("ejecuta la acción cuando la combinación coincide", () => {
    let veces = 0;
    teclado.register({ key: "b", ctrl: true }, () => veces++, destroyRef);

    pulsar({ key: "b", ctrlKey: true });

    expect(veces).toBe(1);
  });

  it("trata Cmd como Ctrl", () => {
    let veces = 0;
    teclado.register({ key: "k", ctrl: true }, () => veces++, destroyRef);

    pulsar({ key: "k", metaKey: true });

    expect(veces).toBe(1);
  });

  it("no dispara si los modificadores no coinciden exactamente", () => {
    let veces = 0;
    teclado.register({ key: "b", ctrl: true }, () => veces++, destroyRef);

    pulsar({ key: "b" });
    pulsar({ key: "b", ctrlKey: true, shiftKey: true });

    expect(veces).toBe(0);
  });

  it("ignora los eventos nacidos en un campo editable", () => {
    let veces = 0;
    teclado.register({ key: "/" }, () => veces++, destroyRef);

    const campo = document.createElement("input");
    document.body.appendChild(campo);
    pulsar({ key: "/" }, campo);
    campo.remove();

    expect(veces).toBe(0);
  });

  it("deja pasar las teclas de función desde un campo editable", () => {
    let veces = 0;
    teclado.register({ key: "F11" }, () => veces++, destroyRef);

    const campo = document.createElement("input");
    document.body.appendChild(campo);
    pulsar({ key: "F11" }, campo);
    campo.remove();

    expect(veces).toBe(1);
  });

  it("bloquea la combinación nativa del navegador por defecto", () => {
    teclado.register({ key: "b", ctrl: true }, () => {}, destroyRef);

    const event = pulsar({ key: "b", ctrlKey: true });

    expect(event.defaultPrevented).toBe(true);
  });

  it("respeta preventDefault: false", () => {
    teclado.register(
      { key: "b", ctrl: true, preventDefault: false },
      () => {},
      destroyRef,
    );

    const event = pulsar({ key: "b", ctrlKey: true });

    expect(event.defaultPrevented).toBe(false);
  });

  it("expone los atajos activos sin la acción", () => {
    teclado.register(
      { key: "b", ctrl: true, description: "Barra lateral" },
      () => {},
      destroyRef,
    );

    const atajos = teclado.list();

    expect(atajos).toHaveLength(1);
    expect(atajos[0]).toMatchObject({
      key: "b",
      ctrl: true,
      description: "Barra lateral",
    });
    expect("run" in atajos[0]).toBe(false);
  });

  it("los lista del más reciente al más antiguo", () => {
    teclado.register({ key: "a" }, () => {}, destroyRef);
    teclado.register({ key: "b" }, () => {}, destroyRef);

    expect(teclado.list().map((atajo) => atajo.key)).toEqual(["b", "a"]);
  });

  it("con la misma combinación gana el último registrado", () => {
    const orden: string[] = [];
    teclado.register({ key: "escape" }, () => orden.push("shell"), destroyRef);
    teclado.register({ key: "escape" }, () => orden.push("hijo"), destroyRef);

    pulsar({ key: "Escape" });

    expect(orden).toEqual(["hijo"]);
  });

  it("al destruirse el último registro, el control vuelve al anterior", () => {
    const orden: string[] = [];

    @Component({ template: "" })
    class Dialogo {
      constructor() {
        TestBed.inject(KeyboardService).register({ key: "escape" }, () =>
          orden.push("dialogo"),
        );
      }
    }

    teclado.register({ key: "escape" }, () => orden.push("shell"), destroyRef);

    const fixture = TestBed.createComponent(Dialogo);
    pulsar({ key: "Escape" });
    expect(orden).toEqual(["dialogo"]);

    fixture.destroy();
    pulsar({ key: "Escape" });
    expect(orden).toEqual(["dialogo", "shell"]);
  });

  it("da de baja el atajo al destruirse el componente que lo registró", () => {
    @Component({ template: "" })
    class Anfitrion {
      veces = 0;
      constructor() {
        TestBed.inject(KeyboardService).register(
          { key: "x" },
          () => this.veces++,
        );
      }
    }

    const fixture = TestBed.createComponent(Anfitrion);
    pulsar({ key: "x" });
    expect(fixture.componentInstance.veces).toBe(1);

    fixture.destroy();
    pulsar({ key: "x" });
    expect(fixture.componentInstance.veces).toBe(1);
  });

  it("la baja que devuelve register retira el atajo sin esperar al DestroyRef", () => {
    let veces = 0;
    const soltar = teclado.register({ key: "k" }, () => veces++, destroyRef);

    pulsar({ key: "k" });
    soltar();
    pulsar({ key: "k" });

    expect(veces).toBe(1);
    expect(teclado.list()).toHaveLength(0);
  });

  it("al soltar el registro de encima, el control vuelve al anterior", () => {
    const disparos: string[] = [];
    teclado.register({ key: "k" }, () => disparos.push("base"), destroyRef);
    const soltar = teclado.register(
      { key: "k" },
      () => disparos.push("encima"),
      destroyRef,
    );

    pulsar({ key: "k" });
    soltar();
    pulsar({ key: "k" });

    expect(disparos).toEqual(["encima", "base"]);
  });
});
