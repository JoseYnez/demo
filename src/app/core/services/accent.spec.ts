import { TestBed } from "@angular/core/testing";

import { AccentService } from "./accent";

describe("AccentService", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty("--accent-hue");
    TestBed.resetTestingModule();
  });

  it("arranca en el defecto sin escribir la propiedad inline", () => {
    const accents = TestBed.inject(AccentService);

    expect(accents.hue()).toBe(158);
    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("");
  });

  it("respeta lo guardado en localStorage y lo aplica al arrancar", () => {
    localStorage.setItem("accent-hue", "245");

    const accents = TestBed.inject(AccentService);

    expect(accents.hue()).toBe(245);
    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("245");
  });

  it("ignora un valor corrupto en localStorage", () => {
    localStorage.setItem("accent-hue", "verde");

    const accents = TestBed.inject(AccentService);

    expect(accents.hue()).toBe(158);
    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("");
  });

  it("aplica el tono al elemento raíz y lo persiste", () => {
    const accents = TestBed.inject(AccentService);

    accents.setHue(280);

    expect(accents.hue()).toBe(280);
    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("280");
    expect(localStorage.getItem("accent-hue")).toBe("280");
  });

  it("normaliza tonos fuera de rango", () => {
    const accents = TestBed.inject(AccentService);

    accents.setHue(365.4);
    expect(accents.hue()).toBe(5);

    accents.setHue(-20);
    expect(accents.hue()).toBe(340);
  });

  it("reset vuelve al defecto y limpia propiedad y storage", () => {
    localStorage.setItem("accent-hue", "245");
    const accents = TestBed.inject(AccentService);

    accents.reset();

    expect(accents.hue()).toBe(158);
    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("");
    expect(localStorage.getItem("accent-hue")).toBeNull();
  });
});
