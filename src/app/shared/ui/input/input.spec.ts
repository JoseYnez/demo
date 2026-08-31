import { TestBed } from "@angular/core/testing";

import { Input } from "./input";

describe("Input", () => {
  it("no muestra el error mientras el campo no se haya tocado", async () => {
    const fixture = TestBed.createComponent(Input);
    fixture.componentRef.setInput("errors", [
      { kind: "required", message: "Obligatorio." },
    ]);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".ui-msg--error")).toBeNull();
  });

  it("muestra el primer error una vez tocado", async () => {
    const fixture = TestBed.createComponent(Input);
    fixture.componentRef.setInput("errors", [
      { kind: "required", message: "Obligatorio." },
      { kind: "minLength", message: "Muy corto." },
    ]);
    fixture.componentRef.setInput("touched", true);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".ui-msg--error")?.textContent?.trim()).toBe(
      "Obligatorio.",
    );
  });

  describe("labelMode float", () => {
    it("nace sin flotar y sin placeholder cuando está vacío", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Nombre");
      fixture.componentRef.setInput("placeholder", "Escribe algo");
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector(".is-floated")).toBeNull();
      expect(el.querySelector("input")?.getAttribute("placeholder")).toBe("");
    });

    it("flota al tener valor y recupera el placeholder", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Nombre");
      fixture.componentRef.setInput("placeholder", "Escribe algo");
      fixture.componentRef.setInput("value", "Ada");
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector(".is-floated")).not.toBeNull();
      expect(el.querySelector("input")?.getAttribute("placeholder")).toBe("Escribe algo");
    });

    it("flota al enfocar y vuelve a bajar al salir vacío", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Nombre");
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      const control = el.querySelector("input") as HTMLInputElement;

      control.dispatchEvent(new FocusEvent("focus"));
      await fixture.whenStable();
      expect(el.querySelector(".is-floated")).not.toBeNull();

      control.dispatchEvent(new FocusEvent("blur"));
      await fixture.whenStable();
      expect(el.querySelector(".is-floated")).toBeNull();
    });

    it("abre la muesca del borde con el texto de la etiqueta", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Nombre");
      fixture.componentRef.setInput("required", true);
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector(".fs__legend")?.textContent?.trim()).toBe("Nombre *");
      expect(el.querySelector(".fs__outline")?.getAttribute("aria-hidden")).toBe("true");
    });

    it("mantiene el label asociado al control", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Nombre");
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      const id = el.querySelector("input")?.id;
      expect(id).toBeTruthy();
      expect(el.querySelector(".fs__label")?.getAttribute("for")).toBe(id);
    });
  });

  it("propaga lo escrito al signal value", async () => {
    const fixture = TestBed.createComponent(Input);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const control = el.querySelector("input") as HTMLInputElement;
    control.value = "hola";
    control.dispatchEvent(new Event("input"));

    expect(fixture.componentInstance.value()).toBe("hola");
  });
});
