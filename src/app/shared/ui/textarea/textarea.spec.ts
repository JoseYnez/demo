import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("no muestra el error mientras el campo no se haya tocado", async () => {
    const fixture = TestBed.createComponent(Textarea);
    fixture.componentRef.setInput("errors", [
      { kind: "required", message: "Obligatorio." },
    ]);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".ui-msg--error")).toBeNull();
  });

  it("muestra el primer error una vez tocado", async () => {
    const fixture = TestBed.createComponent(Textarea);
    fixture.componentRef.setInput("errors", [
      { kind: "required", message: "Obligatorio." },
      { kind: "maxLength", message: "Muy largo." },
    ]);
    fixture.componentRef.setInput("touched", true);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".ui-msg--error")?.textContent?.trim()).toBe(
      "Obligatorio.",
    );
  });

  it("asocia el mensaje con el control", async () => {
    const fixture = TestBed.createComponent(Textarea);
    fixture.componentRef.setInput("hint", "Hasta 280 caracteres.");
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const control = el.querySelector("textarea");
    expect(control?.getAttribute("aria-describedby")).toBe(
      el.querySelector(".ui-msg")?.id,
    );
  });

  it("propaga lo escrito al signal value", async () => {
    const fixture = TestBed.createComponent(Textarea);
    await fixture.whenStable();

    const control = (fixture.nativeElement as HTMLElement).querySelector(
      "textarea",
    ) as HTMLTextAreaElement;
    control.value = "una nota";
    control.dispatchEvent(new Event("input"));

    expect(fixture.componentInstance.value()).toBe("una nota");
  });

  it("avisa de que lo han tocado al salir del campo", async () => {
    const fixture = TestBed.createComponent(Textarea);
    await fixture.whenStable();
    let tocado = 0;
    fixture.componentInstance.touch.subscribe(() => tocado++);

    const control = (fixture.nativeElement as HTMLElement).querySelector(
      "textarea",
    ) as HTMLTextAreaElement;
    control.dispatchEvent(new FocusEvent("blur"));

    expect(tocado).toBe(1);
  });

  it("enfoca el control nativo con focus()", async () => {
    const fixture = TestBed.createComponent(Textarea);
    await fixture.whenStable();

    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(
      (fixture.nativeElement as HTMLElement).querySelector("textarea"),
    );
  });

  describe("labelMode float", () => {
    it("nace sin flotar y sin placeholder cuando está vacío", async () => {
      const fixture = TestBed.createComponent(Textarea);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Notas");
      fixture.componentRef.setInput("placeholder", "Opcional");
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector(".is-floated")).toBeNull();
      expect(el.querySelector("textarea")?.getAttribute("placeholder")).toBe("");
    });

    it("flota al tener valor y recupera el placeholder", async () => {
      const fixture = TestBed.createComponent(Textarea);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Notas");
      fixture.componentRef.setInput("placeholder", "Opcional");
      fixture.componentRef.setInput("value", "algo");
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector(".is-floated")).not.toBeNull();
      expect(el.querySelector("textarea")?.getAttribute("placeholder")).toBe(
        "Opcional",
      );
    });
  });
});
