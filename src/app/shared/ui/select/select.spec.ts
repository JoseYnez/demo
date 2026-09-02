import { ComponentFixture, TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it } from "vitest";

import { Select } from "./select";

const OPCIONES = [
  { value: "admin", label: "Administración" },
  { value: "editor", label: "Edición" },
];

describe("Select", () => {
  let fixture: ComponentFixture<Select>;

  const control = (): HTMLSelectElement =>
    (fixture.nativeElement as HTMLElement).querySelector("select")!;

  async function montar(value = ""): Promise<void> {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Select);
    fixture.componentRef.setInput("label", "Rol");
    fixture.componentRef.setInput("options", OPCIONES);
    fixture.componentRef.setInput("placeholder", "Elige un rol…");
    fixture.componentRef.setInput("value", value);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await montar();
  });

  it("enseña el placeholder mientras el valor está vacío", () => {
    expect(control().value).toBe("");
    expect(control().selectedIndex).toBe(0);
  });

  it("enseña la opción del valor desde el primer render", async () => {
    await montar("editor");

    expect(control().value).toBe("editor");
    expect(control().selectedIndex).toBe(2);
  });

  it("elegir una opción actualiza el valor", async () => {
    control().value = "editor";
    control().dispatchEvent(new Event("change"));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe("editor");
  });

  it("cambiar el valor por fuera mueve la selección", async () => {
    fixture.componentRef.setInput("value", "admin");
    await fixture.whenStable();

    expect(control().value).toBe("admin");
  });
});
