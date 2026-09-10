import { ComponentFixture, TestBed } from "@angular/core/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  aInstante,
  aLocal,
  type DateTimeRangePreset,
} from "./date-time-range";
import { DateTimeRangePicker } from "./date-time-range-picker";

const ZONA = "Europe/Madrid";

const FIJOS: readonly DateTimeRangePreset[] = [
  {
    id: "manana",
    label: "La mañana",
    resolve: () => ({
      from: "2026-09-10T06:00:00Z",
      to: "2026-09-10T10:00:00Z",
    }),
  },
  {
    id: "tarde",
    label: "La tarde",
    resolve: () => ({
      from: "2026-09-10T10:00:00Z",
      to: "2026-09-10T16:00:00Z",
    }),
  },
];

describe("DateTimeRangePicker", () => {
  const original = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let fixture: ComponentFixture<DateTimeRangePicker>;

  beforeAll(() => {
    process.env["TZ"] = ZONA;
  });

  afterAll(() => {
    process.env["TZ"] = original;
  });

  function html(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function disparador(): HTMLButtonElement {
    const boton = html().querySelector<HTMLButtonElement>(".ui-trigger");
    if (!boton) throw new Error("no hay disparador");
    return boton;
  }

  function panel(): HTMLElement | null {
    return html().querySelector<HTMLElement>(".ui-panel");
  }

  function presets(): HTMLButtonElement[] {
    return [...html().querySelectorAll<HTMLButtonElement>(".ui-panel__preset")];
  }

  function campo(cual: "Desde" | "Hasta"): HTMLInputElement {
    const inputs = html().querySelectorAll<HTMLInputElement>(
      ".ui-panel__control",
    );
    const input = inputs[cual === "Desde" ? 0 : 1];
    if (!input) throw new Error(`no hay campo ${cual}`);
    return input;
  }

  function accion(texto: string): HTMLButtonElement {
    const boton = [...html().querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => b.textContent?.trim() === texto,
    );
    if (!boton) throw new Error(`no hay botón ${texto}`);
    return boton;
  }

  function aviso(): string {
    return html().querySelector(".ui-panel__aviso")?.textContent ?? "";
  }

  async function abrir(): Promise<void> {
    disparador().click();
    await fixture.whenStable();
  }

  async function escribir(cual: "Desde" | "Hasta", local: string): Promise<void> {
    const input = campo(cual);
    input.value = local;
    input.dispatchEvent(new Event("input"));
    await fixture.whenStable();
  }

  async function aplicar(): Promise<void> {
    accion("Aplicar").click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(DateTimeRangePicker);
    fixture.componentRef.setInput("presets", FIJOS);
    await fixture.whenStable();
  });

  it("arranca vacío y con el placeholder", () => {
    expect(disparador().textContent?.trim()).toBe("Cualquier momento");
    expect(panel()).toBeNull();
  });

  it("un preset aplica al instante, cierra y se ve elegido", async () => {
    await abrir();
    presets()[0]?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toEqual({
      from: "2026-09-10T06:00:00Z",
      to: "2026-09-10T10:00:00Z",
      presetId: "manana",
    });
    expect(panel()).toBeNull();
    expect(disparador().textContent?.trim()).toBe("La mañana");

    await abrir();
    expect(presets()[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(presets()[1]?.getAttribute("aria-pressed")).toBe("false");
  });

  it("siembra los campos en hora local a partir del valor", async () => {
    fixture.componentRef.setInput("presets", []);
    fixture.componentInstance.value.set({
      from: "2026-09-10T06:00:00Z",
      to: "2026-09-10T16:00:00Z",
    });
    await fixture.whenStable();
    await abrir();

    expect(campo("Desde").value).toBe("2026-09-10T08:00");
    expect(campo("Hasta").value).toBe("2026-09-10T18:00");
  });

  it("el rango escrito guarda instantes en UTC y no entra hasta Aplicar", async () => {
    await abrir();
    await escribir("Desde", "2026-09-10T08:00");
    await escribir("Hasta", "2026-09-10T18:00");
    expect(fixture.componentInstance.value()).toBeNull();

    await aplicar();
    expect(fixture.componentInstance.value()).toEqual({
      from: "2026-09-10T06:00:00Z",
      to: "2026-09-10T16:00:00Z",
    });
    expect(panel()).toBeNull();
  });

  it("rechaza un rango vacío, que en semiabierto no es nada", async () => {
    await abrir();
    await escribir("Desde", "2026-09-10T08:00");
    await escribir("Hasta", "2026-09-10T08:00");
    await aplicar();

    expect(aviso()).toBe("El final tiene que ser posterior al inicio.");
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it("rechaza el orden invertido y se queda abierto", async () => {
    await abrir();
    await escribir("Desde", "2026-09-10T18:00");
    await escribir("Hasta", "2026-09-10T08:00");
    await aplicar();

    expect(aviso()).toBe("El final tiene que ser posterior al inicio.");
    expect(panel()).not.toBeNull();
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it("rechaza media fecha", async () => {
    await abrir();
    await escribir("Desde", "2026-09-10T08:00");
    await aplicar();

    expect(aviso()).toBe("Indica las dos fechas y sus horas.");
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it("respeta minDateTime y maxDateTime al aplicar", async () => {
    fixture.componentRef.setInput("minDateTime", "2026-09-10T06:00:00Z");
    fixture.componentRef.setInput("maxDateTime", "2026-09-10T16:00:00Z");
    await fixture.whenStable();

    await abrir();
    await escribir("Desde", "2026-09-10T07:00");
    await escribir("Hasta", "2026-09-10T19:00");
    await aplicar();
    expect(aviso()).toContain("No puede empezar antes del");

    await escribir("Desde", "2026-09-10T09:00");
    await aplicar();
    expect(aviso()).toContain("No puede terminar después del");
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it("los límites son inclusivos", async () => {
    fixture.componentRef.setInput("minDateTime", "2026-09-10T06:00:00Z");
    fixture.componentRef.setInput("maxDateTime", "2026-09-10T16:00:00Z");
    await fixture.whenStable();

    await abrir();
    await escribir("Desde", "2026-09-10T08:00");
    await escribir("Hasta", "2026-09-10T18:00");
    await aplicar();

    expect(fixture.componentInstance.value()).toEqual({
      from: "2026-09-10T06:00:00Z",
      to: "2026-09-10T16:00:00Z",
    });
  });

  it("deshabilita los presets que se salen de los límites", async () => {
    fixture.componentRef.setInput("minDateTime", "2026-09-10T09:00:00Z");
    await fixture.whenStable();
    await abrir();

    expect(presets()[0]?.disabled).toBe(true);
    expect(presets()[1]?.disabled).toBe(false);
  });

  it("pasa el paso al nativo y rechaza los minutos que no encajan", async () => {
    fixture.componentRef.setInput("minuteStep", 15);
    await fixture.whenStable();
    await abrir();

    expect(campo("Desde").getAttribute("step")).toBe("900");

    await escribir("Desde", "2026-09-10T08:07");
    await escribir("Hasta", "2026-09-10T18:00");
    await aplicar();
    expect(aviso()).toBe("Los minutos van de 15 en 15.");

    await escribir("Desde", "2026-09-10T08:15");
    await aplicar();
    expect(fixture.componentInstance.value()).not.toBeNull();
  });

  it("ata cada campo al otro para que el nativo no ofrezca lo imposible", async () => {
    await abrir();
    await escribir("Desde", "2026-09-10T08:00");

    expect(campo("Hasta").getAttribute("min")).toBe("2026-09-10T08:00");
    await escribir("Hasta", "2026-09-10T18:00");
    expect(campo("Desde").getAttribute("max")).toBe("2026-09-10T18:00");
  });

  describe("hora que no existe", () => {
    it("la repinta, avisa y no aplica todavía", async () => {
      await abrir();
      await escribir("Desde", "2026-03-29T02:30");
      await escribir("Hasta", "2026-03-29T12:00");
      await aplicar();

      expect(campo("Desde").value).toBe("2026-03-29T03:30");
      expect(aviso()).toBe(
        "Esa hora no existe por el cambio de horario; se ha usado 03:30.",
      );
      expect(panel()).not.toBeNull();
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it("el segundo Aplicar entra con la hora corregida", async () => {
      await abrir();
      await escribir("Desde", "2026-03-29T02:30");
      await escribir("Hasta", "2026-03-29T12:00");
      await aplicar();
      await aplicar();

      expect(fixture.componentInstance.value()).toEqual({
        from: "2026-03-29T01:30:00Z",
        to: aInstante("2026-03-29T12:00"),
      });
      expect(panel()).toBeNull();
    });
  });

  it("limpiar vacía el valor", async () => {
    fixture.componentInstance.value.set({
      from: "2026-09-10T06:00:00Z",
      to: "2026-09-10T16:00:00Z",
    });
    await fixture.whenStable();
    await abrir();
    accion("Limpiar").click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBeNull();
    expect(disparador().textContent?.trim()).toBe("Cualquier momento");
  });

  it("cerrar sin aplicar descarta el borrador", async () => {
    await abrir();
    await escribir("Desde", "2026-09-10T08:00");
    disparador().click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBeNull();
    await abrir();
    expect(campo("Desde").value).toBe("");
  });

  it("cerrar marca el control como tocado", async () => {
    let tocado = 0;
    fixture.componentInstance.touch.subscribe(() => (tocado += 1));
    await abrir();
    disparador().click();
    await fixture.whenStable();

    expect(tocado).toBe(1);
  });

  it("enseña el error sólo cuando está tocado", async () => {
    fixture.componentRef.setInput("errors", [{ message: "Elige un periodo." }]);
    await fixture.whenStable();
    expect(html().textContent).not.toContain("Elige un periodo.");

    fixture.componentRef.setInput("touched", true);
    await fixture.whenStable();
    expect(html().textContent).toContain("Elige un periodo.");
    expect(disparador().getAttribute("aria-invalid")).toBe("true");
  });

  it("asocia el mensaje con el disparador", async () => {
    fixture.componentRef.setInput("hint", "Con hora local.");
    await fixture.whenStable();

    const id = disparador().getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(html().querySelector(`#${id}`)?.textContent).toContain(
      "Con hora local.",
    );
  });

  it("la etiqueta cae al rango formateado cuando el preset ya no está", async () => {
    fixture.componentInstance.value.set({
      from: "2026-09-10T06:00:00Z",
      to: "2026-09-10T16:00:00Z",
      presetId: "yaNoExiste",
    });
    await fixture.whenStable();

    expect(disparador().textContent?.trim()).toBe(
      "10 sept 2026, 08:00 – 18:00",
    );
  });

  it("bloqueado no abre", async () => {
    fixture.componentRef.setInput("disabled", true);
    await fixture.whenStable();
    disparador().click();
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it("Escape cierra aunque el foco esté dentro de un campo", async () => {
    await abrir();
    campo("Desde").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await fixture.whenStable();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(disparador());
  });

  it("focus() lleva el foco al disparador", () => {
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(disparador());
  });

  it("aLocal y el campo hablan el mismo idioma", async () => {
    await abrir();
    await escribir("Desde", aLocal("2026-01-09T08:00:00Z"));
    expect(campo("Desde").value).toBe("2026-01-09T09:00");
  });
});
