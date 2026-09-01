import { TestBed } from "@angular/core/testing";

import { Select, SelectOption } from "./select";

const AREAS: readonly SelectOption[] = [
  { value: "front", label: "Frontend" },
  { value: "back", label: "Backend" },
  { value: "qa", label: "QA", disabled: true },
];

async function crear(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(Select);
  fixture.componentRef.setInput("options", AREAS);
  for (const [nombre, valor] of Object.entries(inputs)) {
    fixture.componentRef.setInput(nombre, valor);
  }
  await fixture.whenStable();
  return fixture;
}

function control(fixture: { nativeElement: HTMLElement }): HTMLSelectElement {
  return fixture.nativeElement.querySelector("select") as HTMLSelectElement;
}

describe("Select", () => {
  it("muestra el valor inicial, no la primera opción", async () => {
    const fixture = await crear({ value: "back", placeholder: "Selecciona…" });

    expect(control(fixture).value).toBe("back");
    expect(control(fixture).selectedOptions[0]?.textContent?.trim()).toBe("Backend");
  });

  it("muestra el placeholder cuando el valor está vacío", async () => {
    const fixture = await crear({ placeholder: "Selecciona…" });

    expect(control(fixture).value).toBe("");
    expect(control(fixture).selectedOptions[0]?.textContent?.trim()).toBe(
      "Selecciona…",
    );
  });

  it("sigue al modelo cuando el valor cambia desde fuera", async () => {
    const fixture = await crear({ value: "back", placeholder: "Selecciona…" });

    for (const valor of ["front", "back", "front"]) {
      fixture.componentRef.setInput("value", valor);
      await fixture.whenStable();
      expect(control(fixture).value).toBe(valor);
    }
  });

  it("propaga la elección del usuario al signal value", async () => {
    const fixture = await crear({ placeholder: "Selecciona…" });

    const select = control(fixture);
    select.value = "back";
    select.dispatchEvent(new Event("change"));

    expect(fixture.componentInstance.value()).toBe("back");
  });

  it("marca como deshabilitadas las opciones sin cupo", async () => {
    const fixture = await crear();

    const qa = control(fixture).querySelector<HTMLOptionElement>('option[value="qa"]');
    expect(qa?.disabled).toBe(true);
  });

  it("no muestra el error mientras el campo no se haya tocado", async () => {
    const fixture = await crear({
      errors: [{ kind: "required", message: "Elige un área." }],
    });

    expect(fixture.nativeElement.querySelector(".ui-msg--error")).toBeNull();

    fixture.componentRef.setInput("touched", true);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector(".ui-msg--error")?.textContent?.trim(),
    ).toBe("Elige un área.");
  });
});
