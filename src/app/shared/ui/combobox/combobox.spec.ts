import { ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Combobox } from "./combobox";
import type { ComboboxOption } from "./suggestions";

const CIUDADES: readonly ComboboxOption[] = [
  { label: "Ávila", detail: "Castilla y León" },
  { label: "Madrid", detail: "Comunidad de Madrid" },
  { label: "Málaga", detail: "Andalucía" },
  { label: "Teruel", detail: "Aragón", disabled: true },
  { label: "Toledo", detail: "Castilla-La Mancha" },
];

describe("Combobox", () => {
  let fixture: ComponentFixture<Combobox>;

  function html(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function campo(): HTMLInputElement {
    const input = html().querySelector<HTMLInputElement>("input");
    if (!input) throw new Error("no hay campo");
    return input;
  }

  function lista(): HTMLElement | null {
    return html().querySelector<HTMLElement>(".ui-panel");
  }

  function opciones(): HTMLLIElement[] {
    return [...html().querySelectorAll<HTMLLIElement>(".combobox__opcion")];
  }

  function etiquetas(): string[] {
    return opciones().map((li) => li.textContent?.trim() ?? "");
  }

  function destacada(): HTMLLIElement | null {
    return html().querySelector<HTMLLIElement>(".combobox__opcion.is-destacada");
  }

  async function escribir(texto: string): Promise<void> {
    campo().value = texto;
    campo().dispatchEvent(new Event("input"));
    await fixture.whenStable();
  }

  async function tecla(key: string, init: KeyboardEventInit = {}): Promise<void> {
    campo().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
    await fixture.whenStable();
  }

  async function pulsarCampo(): Promise<void> {
    campo().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    Element.prototype.scrollIntoView = vi.fn();
    fixture = TestBed.createComponent(Combobox);
    fixture.componentRef.setInput("options", CIUDADES);
    fixture.componentRef.setInput("label", "Ciudad");
    await fixture.whenStable();
  });

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  });

  it("nace cerrado y lo declara en aria-expanded", () => {
    expect(lista()).toBeNull();
    expect(campo().getAttribute("aria-expanded")).toBe("false");
    expect(campo().getAttribute("role")).toBe("combobox");
  });

  it("pulsar el campo despliega la lista entera", async () => {
    await pulsarCampo();

    expect(campo().getAttribute("aria-expanded")).toBe("true");
    expect(etiquetas()).toHaveLength(5);
  });

  it("pulsar otra vez no cierra: cerrar es Esc, Tab, fuera o elegir", async () => {
    await pulsarCampo();
    await pulsarCampo();

    expect(lista()).not.toBeNull();
  });

  it("escribir filtra sin tildes y despliega solo si hay coincidencias", async () => {
    await escribir("mala");

    expect(etiquetas().some((t) => t.includes("Málaga"))).toBe(true);
    expect(opciones()).toHaveLength(1);
  });

  it("no despliega nada para enseñar que no hay coincidencias", async () => {
    await escribir("zzz");

    expect(lista()).toBeNull();
  });

  it("pero si ya estaba abierta se queda, con el mensaje de vacío", async () => {
    await escribir("ma");
    expect(lista()).not.toBeNull();

    await escribir("mazz");

    expect(lista()).not.toBeNull();
    expect(opciones()).toHaveLength(0);
    expect(html().querySelector(".combobox__vacio")?.textContent?.trim()).toBe(
      "Sin coincidencias",
    );
  });

  it("volver a desplegar olvida el filtro y enseña todo", async () => {
    await escribir("mala");
    await tecla("Escape");
    await pulsarCampo();

    expect(opciones()).toHaveLength(5);
  });

  it("escribir no destaca nada, para que Enter envíe lo escrito", async () => {
    await escribir("ma");

    expect(destacada()).toBeNull();
    expect(campo().getAttribute("aria-activedescendant")).toBeNull();
  });

  it("la flecha abajo abre y destaca la primera", async () => {
    await tecla("ArrowDown");

    expect(lista()).not.toBeNull();
    expect(destacada()).toBe(opciones()[0]);
    expect(campo().getAttribute("aria-activedescendant")).toBe(
      destacada()?.getAttribute("id"),
    );
  });

  it("la flecha arriba abre y destaca la última", async () => {
    await tecla("ArrowUp");

    expect(destacada()?.textContent).toContain("Toledo");
  });

  it("Alt+flecha abajo abre sin destacar, y Alt+flecha arriba cierra", async () => {
    await tecla("ArrowDown", { altKey: true });
    expect(lista()).not.toBeNull();
    expect(destacada()).toBeNull();

    await tecla("ArrowUp", { altKey: true });
    expect(lista()).toBeNull();
  });

  it("salta las deshabilitadas al recorrer", async () => {
    await escribir("t");
    expect(opciones()).toHaveLength(3);
    expect(opciones()[1]?.getAttribute("aria-disabled")).toBe("true");

    await tecla("ArrowDown");
    expect(destacada()).toBe(opciones()[0]);

    await tecla("ArrowDown");
    expect(destacada()?.textContent).toContain("Toledo");
  });

  it("da la vuelta al llegar al final", async () => {
    await tecla("ArrowUp");
    expect(destacada()?.textContent).toContain("Toledo");

    await tecla("ArrowDown");

    expect(destacada()).toBe(opciones()[0]);
  });

  it("Enter sobre la destacada la elige, cierra y avisa", async () => {
    const elegidas: ComboboxOption[] = [];
    fixture.componentInstance.picked.subscribe((o) => elegidas.push(o));

    await escribir("mad");
    await tecla("ArrowDown");
    await tecla("Enter");

    expect(fixture.componentInstance.value()).toBe("Madrid");
    expect(elegidas.map((o) => o.label)).toEqual(["Madrid"]);
    expect(lista()).toBeNull();
  });

  it("Enter sin nada destacado deja pasar lo escrito", async () => {
    await escribir("Cualquier cosa");
    const evento = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    campo().dispatchEvent(evento);
    await fixture.whenStable();

    expect(evento.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.value()).toBe("Cualquier cosa");
  });

  it("pulsar una opción la elige", async () => {
    await pulsarCampo();
    const madrid = opciones().find((li) => li.textContent?.includes("Madrid"));
    madrid?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe("Madrid");
    expect(lista()).toBeNull();
  });

  it("pulsar una deshabilitada no hace nada", async () => {
    await pulsarCampo();
    const teruel = opciones().find((li) => li.textContent?.includes("Teruel"));
    teruel?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe("");
    expect(lista()).not.toBeNull();
  });

  it("Esc cierra sin tocar el valor", async () => {
    await escribir("mad");
    await tecla("Escape");

    expect(lista()).toBeNull();
    expect(fixture.componentInstance.value()).toBe("mad");
  });

  it("resalta el trozo que coincide", async () => {
    await escribir("adri");

    expect(html().querySelector(".combobox__match")?.textContent).toBe("adri");
  });

  it("deshabilitado y de sólo lectura no despliegan", async () => {
    fixture.componentRef.setInput("disabled", true);
    await fixture.whenStable();
    await tecla("ArrowDown");
    expect(lista()).toBeNull();

    fixture.componentRef.setInput("disabled", false);
    fixture.componentRef.setInput("readonly", true);
    await fixture.whenStable();
    await tecla("ArrowDown");
    expect(lista()).toBeNull();
  });

  it("no muestra el error mientras no se haya tocado", async () => {
    fixture.componentRef.setInput("errors", [{ kind: "required", message: "Obligatorio." }]);
    await fixture.whenStable();

    expect(html().querySelector(".ui-msg--error")).toBeNull();

    fixture.componentRef.setInput("touched", true);
    await fixture.whenStable();

    expect(html().querySelector(".ui-msg--error")?.textContent?.trim()).toBe("Obligatorio.");
  });

  it("emite touch al salir del campo", async () => {
    let tocado = 0;
    fixture.componentInstance.touch.subscribe(() => (tocado += 1));

    campo().dispatchEvent(new FocusEvent("blur"));
    await fixture.whenStable();

    expect(tocado).toBe(1);
  });

  describe("clearOnOpen", () => {
    beforeEach(async () => {
      fixture.componentRef.setInput("clearOnOpen", true);
      fixture.componentRef.setInput("value", "Madrid");
      await fixture.whenStable();
    });

    it("abrir vacía lo que se ve, nunca el valor", async () => {
      await pulsarCampo();

      expect(campo().value).toBe("");
      expect(fixture.componentInstance.value()).toBe("Madrid");
      expect(opciones()).toHaveLength(5);
    });

    it("salir sin tocar nada devuelve el texto", async () => {
      await pulsarCampo();
      await tecla("Escape");

      expect(campo().value).toBe("Madrid");
      expect(fixture.componentInstance.value()).toBe("Madrid");
    });

    it("lo escrito se queda al salir aunque no salga de la lista", async () => {
      await pulsarCampo();
      await escribir("Cuenca de la Sierra");
      await tecla("Escape");

      expect(campo().value).toBe("Cuenca de la Sierra");
      expect(fixture.componentInstance.value()).toBe("Cuenca de la Sierra");
    });

    it("elegir de la lista manda sobre el vaciado", async () => {
      await pulsarCampo();
      const toledo = opciones().find((li) => li.textContent?.includes("Toledo"));
      toledo?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await fixture.whenStable();

      expect(campo().value).toBe("Toledo");
      expect(fixture.componentInstance.value()).toBe("Toledo");
    });

    it("llegar con el foco sin abrir la lista no vacía nada", async () => {
      campo().dispatchEvent(new FocusEvent("focus"));
      await fixture.whenStable();

      expect(campo().value).toBe("Madrid");
      expect(lista()).toBeNull();
    });

    it("sin la opción puesta, abrir conserva el texto", async () => {
      fixture.componentRef.setInput("clearOnOpen", false);
      await fixture.whenStable();
      await pulsarCampo();

      expect(campo().value).toBe("Madrid");
      expect(opciones()).toHaveLength(5);
    });
  });

  it("la región viva existe desde el primer render y cuenta las sugerencias", async () => {
    const region = html().querySelector(".combobox__anuncio");
    expect(region).not.toBeNull();
    expect(region?.textContent?.trim()).toBe("");

    await pulsarCampo();
    expect(region?.textContent?.trim()).toBe("5 sugerencias");

    await escribir("mad");
    expect(region?.textContent?.trim()).toBe("1 sugerencia");
  });
});
