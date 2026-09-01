import { TestBed } from "@angular/core/testing";

import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("propaga lo escrito al signal value", async () => {
    const fixture = TestBed.createComponent(Textarea);
    await fixture.whenStable();

    const control = fixture.nativeElement.querySelector(
      "textarea",
    ) as HTMLTextAreaElement;
    control.value = "dos\nlíneas";
    control.dispatchEvent(new Event("input"));

    expect(fixture.componentInstance.value()).toBe("dos\nlíneas");
  });

  it("se declara multilínea para que la etiqueta flotante no se centre", async () => {
    const fixture = TestBed.createComponent(Textarea);
    fixture.componentRef.setInput("labelMode", "float");
    fixture.componentRef.setInput("label", "Notas");
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".fs--float.fs--multilinea")).not.toBeNull();
  });

  it("liga la pista al control con aria-describedby", async () => {
    const fixture = TestBed.createComponent(Textarea);
    fixture.componentRef.setInput("hint", "Opcional.");
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const id = el.querySelector("textarea")?.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(el.querySelector(`#${id}`)?.textContent?.trim()).toBe("Opcional.");
  });

  it("señala el sólo lectura también en modo flotante", async () => {
    const fixture = TestBed.createComponent(Textarea);
    fixture.componentRef.setInput("labelMode", "float");
    fixture.componentRef.setInput("label", "Notas");
    fixture.componentRef.setInput("readonly", true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector(".fs.is-readonly")).not.toBeNull();
  });

  it("muestra el primer error una vez tocado", async () => {
    const fixture = TestBed.createComponent(Textarea);
    fixture.componentRef.setInput("errors", [
      { kind: "required", message: "Obligatorio." },
    ]);
    fixture.componentRef.setInput("touched", true);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector(".ui-msg--error")?.textContent?.trim(),
    ).toBe("Obligatorio.");
  });
});
