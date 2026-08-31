import { TestBed } from "@angular/core/testing";

import { AccentService } from "./accent";

describe("AccentService", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty("--accent-hue");
    document.documentElement.removeAttribute("data-accent-hue");
    document.documentElement.removeAttribute("data-accent-locked");
    TestBed.resetTestingModule();
  });

  function entorno(hue?: string, locked = false): void {
    if (hue !== undefined) document.documentElement.setAttribute("data-accent-hue", hue);
    if (locked) document.documentElement.setAttribute("data-accent-locked", "");
  }

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

  describe("tono del entorno", () => {
    it("arranca en el tono del entorno y lo aplica", () => {
      entorno("245");

      const accents = TestBed.inject(AccentService);

      expect(accents.hue()).toBe(245);
      expect(accents.baseHue).toBe(245);
      expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("245");
    });

    it("lo guardado por el usuario gana al tono del entorno", () => {
      entorno("245");
      localStorage.setItem("accent-hue", "280");

      const accents = TestBed.inject(AccentService);

      expect(accents.hue()).toBe(280);
    });

    it("ignora un atributo corrupto y cae al defecto de fábrica", () => {
      entorno("azul");

      const accents = TestBed.inject(AccentService);

      expect(accents.hue()).toBe(158);
      expect(accents.baseHue).toBe(158);
      expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("");
    });

    it("normaliza un tono del entorno fuera de rango", () => {
      entorno("400");

      expect(TestBed.inject(AccentService).hue()).toBe(40);
    });

    it("reset vuelve al tono del entorno, no al de fábrica", () => {
      entorno("245");
      localStorage.setItem("accent-hue", "280");
      const accents = TestBed.inject(AccentService);

      accents.reset();

      expect(accents.hue()).toBe(245);
      expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("245");
      expect(localStorage.getItem("accent-hue")).toBeNull();
    });
  });

  describe("acento bloqueado", () => {
    it("ignora lo guardado sin borrarlo", () => {
      entorno("245", true);
      localStorage.setItem("accent-hue", "280");

      const accents = TestBed.inject(AccentService);

      expect(accents.locked).toBe(true);
      expect(accents.hue()).toBe(245);
      expect(localStorage.getItem("accent-hue")).toBe("280");
    });

    it("setHue no cambia nada ni persiste", () => {
      entorno("245", true);
      const accents = TestBed.inject(AccentService);

      accents.setHue(10);

      expect(accents.hue()).toBe(245);
      expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("245");
      expect(localStorage.getItem("accent-hue")).toBeNull();
    });

    it("previewHue sí aplica, pero no persiste", () => {
      entorno("245", true);
      const accents = TestBed.inject(AccentService);

      accents.previewHue(10);

      expect(accents.hue()).toBe(10);
      expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("10");
      expect(localStorage.getItem("accent-hue")).toBeNull();
    });

    it("bloquear sin tono de entorno fija el defecto de fábrica", () => {
      entorno(undefined, true);
      localStorage.setItem("accent-hue", "280");

      const accents = TestBed.inject(AccentService);

      expect(accents.hue()).toBe(158);
      expect(accents.baseHue).toBe(158);
    });
  });
});
