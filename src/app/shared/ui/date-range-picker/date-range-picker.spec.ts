import { ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  hoyISO,
  inicioDeMes,
  sumarMeses,
  type DateRangePreset,
} from "./date-range";
import { DateRangePicker } from "./date-range-picker";

const MIOS: readonly DateRangePreset[] = [
  {
    id: "quarter",
    label: "Este trimestre",
    resolve: (hoy) => ({ from: inicioDeMes(sumarMeses(hoy, -2)), to: hoy }),
  },
];

const FIJOS: readonly DateRangePreset[] = [
  {
    id: "enero",
    label: "Enero",
    resolve: () => ({ from: "2026-01-01", to: "2026-01-31" }),
  },
  {
    id: "febrero",
    label: "Febrero",
    resolve: () => ({ from: "2026-02-01", to: "2026-02-28" }),
  },
  {
    id: "marzo",
    label: "Marzo",
    resolve: () => ({ from: "2026-03-01", to: "2026-03-31" }),
  },
];

describe("DateRangePicker", () => {
  let fixture: ComponentFixture<DateRangePicker>;

  function html(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function disparador(): HTMLButtonElement {
    const boton = html().querySelector<HTMLButtonElement>(".drp__trigger");
    if (!boton) throw new Error("no hay disparador");
    return boton;
  }

  function panel(): HTMLElement | null {
    return html().querySelector<HTMLElement>(".drp__panel");
  }

  function presets(): HTMLButtonElement[] {
    return [...html().querySelectorAll<HTMLButtonElement>(".drp__preset")];
  }

  function campo(cual: "Desde" | "Hasta"): HTMLInputElement {
    const inputs = html().querySelectorAll<HTMLInputElement>(".drp__fecha");
    const input = inputs[cual === "Desde" ? 0 : 1];
    if (!input) throw new Error(`no hay campo ${cual}`);
    return input;
  }

  function accion(texto: string): HTMLButtonElement {
    const boton = [
      ...html().querySelectorAll<HTMLButtonElement>("button"),
    ].find((b) => b.textContent?.trim() === texto);
    if (!boton) throw new Error(`no hay botón ${texto}`);
    return boton;
  }

  function aviso(): string {
    return html().querySelector(".drp__aviso")?.textContent ?? "";
  }

  async function escribir(cual: "Desde" | "Hasta", iso: string): Promise<void> {
    const input = campo(cual);
    input.value = iso;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await fixture.whenStable();
  }

  async function pulsar(elemento: HTMLElement): Promise<void> {
    elemento.click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(DateRangePicker);
    await fixture.whenStable();
  });

  it("empieza vacío, cerrado y con el placeholder", () => {
    expect(panel()).toBeNull();
    expect(disparador().getAttribute("aria-expanded")).toBe("false");
    expect(disparador().textContent).toContain("Cualquier fecha");
  });

  it("abre y cierra con el disparador", async () => {
    await pulsar(disparador());
    expect(panel()).not.toBeNull();
    expect(disparador().getAttribute("aria-expanded")).toBe("true");

    await pulsar(disparador());
    expect(panel()).toBeNull();
  });

  it("no abre si está bloqueado", async () => {
    fixture.componentRef.setInput("disabled", true);
    await fixture.whenStable();
    await pulsar(disparador());
    expect(panel()).toBeNull();
  });

  it("readonly bloquea el disparador y lo anuncia", async () => {
    fixture.componentRef.setInput("readonly", true);
    await fixture.whenStable();

    expect(disparador().disabled).toBe(true);
    expect(disparador().getAttribute("aria-readonly")).toBe("true");
    await pulsar(disparador());
    expect(panel()).toBeNull();
  });

  it("un preset aplica al instante, cierra y se ve elegido", async () => {
    await pulsar(disparador());
    const hoy = hoyISO();
    await pulsar(presets()[0]);

    expect(fixture.componentInstance.value()).toEqual({
      from: hoy,
      to: hoy,
      presetId: "today",
    });
    expect(panel()).toBeNull();
    expect(disparador().textContent).toContain("Hoy");

    await pulsar(disparador());
    expect(presets()[0].getAttribute("aria-pressed")).toBe("true");
    expect(presets()[1].getAttribute("aria-pressed")).toBe("false");
  });

  it("usa los presets que le den, no los de fábrica", async () => {
    fixture.componentRef.setInput("presets", MIOS);
    await fixture.whenStable();
    await pulsar(disparador());

    expect(presets()).toHaveLength(1);
    await pulsar(presets()[0]);

    expect(fixture.componentInstance.value()?.presetId).toBe("quarter");
    expect(disparador().textContent).toContain("Este trimestre");
  });

  it("sin presets deja sólo el rango personalizado", async () => {
    fixture.componentRef.setInput("presets", []);
    await fixture.whenStable();
    await pulsar(disparador());

    expect(presets()).toHaveLength(0);
    expect(campo("Desde")).toBeTruthy();
  });

  it("deshabilita los presets que se salen de minDate y maxDate", async () => {
    fixture.componentRef.setInput("presets", FIJOS);
    fixture.componentRef.setInput("minDate", "2026-02-01");
    fixture.componentRef.setInput("maxDate", "2026-03-15");
    await fixture.whenStable();
    await pulsar(disparador());

    expect(presets().map((b) => b.disabled)).toEqual([true, false, true]);

    await pulsar(presets()[0]);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(panel()).not.toBeNull();

    await pulsar(presets()[1]);
    expect(fixture.componentInstance.value()?.presetId).toBe("febrero");
  });

  it("el rango escrito no entra hasta Aplicar", async () => {
    await pulsar(disparador());
    await escribir("Desde", "2026-09-01");
    await escribir("Hasta", "2026-09-30");

    expect(fixture.componentInstance.value()).toBeNull();

    await pulsar(accion("Aplicar"));

    expect(fixture.componentInstance.value()).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(panel()).toBeNull();
    expect(disparador().textContent).toContain("–");
  });

  it("rechaza el orden invertido y se queda abierto", async () => {
    await pulsar(disparador());
    await escribir("Desde", "2026-09-30");
    await escribir("Hasta", "2026-09-01");
    await pulsar(accion("Aplicar"));

    expect(fixture.componentInstance.value()).toBeNull();
    expect(panel()).not.toBeNull();
    expect(aviso()).toContain("posterior");
  });

  it("rechaza media fecha", async () => {
    await pulsar(disparador());
    await escribir("Desde", "2026-09-01");
    await pulsar(accion("Aplicar"));

    expect(fixture.componentInstance.value()).toBeNull();
    expect(aviso()).toContain("las dos fechas");
  });

  it("distingue una fecha que no vale del orden invertido", async () => {
    await pulsar(disparador());
    await escribir("Desde", "20260-09-09");
    await escribir("Hasta", "2026-09-10");
    await pulsar(accion("Aplicar"));

    expect(fixture.componentInstance.value()).toBeNull();
    expect(aviso()).toContain("no es válida");
  });

  it("respeta minDate y maxDate al aplicar", async () => {
    fixture.componentRef.setInput("minDate", "2026-09-05");
    fixture.componentRef.setInput("maxDate", "2026-09-20");
    await fixture.whenStable();

    await pulsar(disparador());
    await escribir("Desde", "2026-09-01");
    await escribir("Hasta", "2026-09-10");
    await pulsar(accion("Aplicar"));
    expect(fixture.componentInstance.value()).toBeNull();
    expect(aviso()).toContain("antes del");

    await escribir("Desde", "2026-09-06");
    await escribir("Hasta", "2026-09-25");
    await pulsar(accion("Aplicar"));
    expect(fixture.componentInstance.value()).toBeNull();
    expect(aviso()).toContain("después del");
  });

  it("limpiar vacía el valor", async () => {
    await pulsar(disparador());
    await pulsar(presets()[0]);
    await pulsar(disparador());
    await pulsar(accion("Limpiar"));

    expect(fixture.componentInstance.value()).toBeNull();
    expect(disparador().textContent).toContain("Cualquier fecha");
  });

  it("cerrar sin aplicar descarta el borrador", async () => {
    await pulsar(disparador());
    await pulsar(presets()[0]);

    await pulsar(disparador());
    await escribir("Desde", "2020-01-01");
    await pulsar(disparador());

    await pulsar(disparador());
    expect(campo("Desde").value).toBe(hoyISO());
  });

  it("Escape cierra aunque el foco esté dentro de un campo", async () => {
    await pulsar(disparador());
    campo("Desde").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await fixture.whenStable();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(disparador());
  });

  it("pulsar fuera cierra sin robar el foco de vuelta", async () => {
    await pulsar(disparador());
    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true }),
    );
    await fixture.whenStable();

    expect(panel()).toBeNull();
    expect(document.activeElement).not.toBe(disparador());
  });

  it("cerrar marca el control como tocado", async () => {
    let tocado = 0;
    fixture.componentInstance.touch.subscribe(() => tocado++);

    await pulsar(disparador());
    expect(tocado).toBe(0);

    await pulsar(disparador());
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
    fixture.componentRef.setInput("hint", "El periodo del informe.");
    await fixture.whenStable();

    const id = disparador().getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(html().querySelector(`#${id}`)?.textContent).toContain(
      "El periodo del informe.",
    );
  });

  it("focus() lleva el foco al disparador", () => {
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(disparador());
  });

  describe("colocación del panel", () => {
    const ALTO_DISPARADOR = 34;
    const ALTO_PANEL = 300;
    const HUECO = 4;

    function simularGeometria(disparadorTop: number, altoVisible: number): void {
      Object.defineProperty(document.documentElement, "clientHeight", {
        value: altoVisible,
        configurable: true,
      });
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: 1280,
        configurable: true,
      });
      Element.prototype.scrollIntoView = vi.fn();
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
        function (this: Element): DOMRect {
          let top = 0;
          let height = 0;
          if (this.classList.contains("drp__trigger")) {
            top = disparadorTop;
            height = ALTO_DISPARADOR;
          } else if (this.classList.contains("drp__panel")) {
            height = ALTO_PANEL;
            top = this.classList.contains("is-arriba")
              ? disparadorTop - HUECO - ALTO_PANEL
              : disparadorTop + ALTO_DISPARADOR + HUECO;
          }
          const caja = {
            x: 0,
            y: top,
            left: 0,
            right: 480,
            width: 480,
            top,
            height,
            bottom: top + height,
          };
          return { ...caja, toJSON: () => caja };
        },
      );
    }

    afterEach(() => {
      vi.restoreAllMocks();
      Reflect.deleteProperty(document.documentElement, "clientHeight");
      Reflect.deleteProperty(document.documentElement, "clientWidth");
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    });

    it("entra el foco al panel sin desplazar la página", async () => {
      const foco = vi.spyOn(HTMLElement.prototype, "focus");
      await pulsar(disparador());

      expect(document.activeElement).toBe(panel());
      expect(foco).toHaveBeenCalledWith({ preventScroll: true });
    });

    it("voltea hacia arriba cuando no cabe debajo y sí encima", async () => {
      simularGeometria(600, 720);
      await pulsar(disparador());

      expect(panel()?.classList.contains("is-arriba")).toBe(true);
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });

    it("se queda debajo cuando cabe", async () => {
      simularGeometria(100, 720);
      await pulsar(disparador());

      expect(panel()?.classList.contains("is-arriba")).toBe(false);
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });

    it("vuelve a medir desde abajo en cada apertura", async () => {
      simularGeometria(600, 720);
      await pulsar(disparador());
      expect(panel()?.classList.contains("is-arriba")).toBe(true);

      await pulsar(disparador());
      await pulsar(disparador());
      expect(panel()?.classList.contains("is-arriba")).toBe(true);
    });

    it("si no cabe en ningún lado se queda debajo y se trae a la vista", async () => {
      simularGeometria(200, 400);
      await pulsar(disparador());

      expect(panel()?.classList.contains("is-arriba")).toBe(false);
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        block: "nearest",
      });
    });
  });
});
