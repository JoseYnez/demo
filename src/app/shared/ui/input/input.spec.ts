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
