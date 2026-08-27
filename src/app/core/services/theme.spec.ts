import { TestBed } from "@angular/core/testing";

import { ThemeService } from "./theme";

describe("ThemeService", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    TestBed.resetTestingModule();
  });

  it("arranca en claro cuando no hay nada guardado ni matchMedia", () => {
    const themes = TestBed.inject(ThemeService);
    expect(themes.theme()).toBe("light");
  });

  it("respeta lo guardado en localStorage", () => {
    localStorage.setItem("theme", "dark");
    const themes = TestBed.inject(ThemeService);
    expect(themes.theme()).toBe("dark");
  });

  it("aplica el tema al elemento raíz y lo persiste", () => {
    const themes = TestBed.inject(ThemeService);

    themes.setTheme("dark");

    expect(document.documentElement.dataset["theme"]).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("alterna entre claro y oscuro", () => {
    const themes = TestBed.inject(ThemeService);

    themes.toggle();
    expect(themes.theme()).toBe("dark");

    themes.toggle();
    expect(themes.theme()).toBe("light");
  });
});
