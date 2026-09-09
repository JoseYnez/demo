import { ComponentFixture, TestBed } from "@angular/core/testing";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TauriDemo } from "./tauri-demo";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: () => false,
}));

async function montar(): Promise<ComponentFixture<TauriDemo>> {
  TestBed.resetTestingModule();
  const fixture = TestBed.createComponent(TauriDemo);
  await fixture.whenStable();
  return fixture;
}

function raizDe(fixture: ComponentFixture<TauriDemo>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

async function saludar(fixture: ComponentFixture<TauriDemo>): Promise<void> {
  const campo = raizDe(fixture).querySelector("input") as HTMLInputElement;
  campo.value = "Ada";
  campo.dispatchEvent(new Event("input"));
  await fixture.whenStable();

  raizDe(fixture).querySelector("form")!.dispatchEvent(
    new Event("submit", { cancelable: true }),
  );
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

describe("TauriDemo", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("arranca sin saludo ni error", async () => {
    const fixture = await montar();

    expect(raizDe(fixture).querySelector(".demo__result")).toBeNull();
    expect(raizDe(fixture).querySelector(".demo__error")).toBeNull();
  });

  it("enseña lo que devuelve el comando", async () => {
    vi.mocked(invoke).mockResolvedValue("Hola, Ada. Esto viene de Rust.");
    const fixture = await montar();

    await saludar(fixture);

    expect(invoke).toHaveBeenCalledWith("greet", { name: "Ada" });
    expect(raizDe(fixture).querySelector(".demo__result")?.textContent).toContain(
      "Hola, Ada. Esto viene de Rust.",
    );
  });

  it("enseña el error del wrapper y borra el saludo anterior", async () => {
    vi.mocked(invoke).mockResolvedValueOnce("Hola, Ada. Esto viene de Rust.");
    const fixture = await montar();
    await saludar(fixture);

    vi.mocked(invoke).mockRejectedValue(new TypeError("sin Tauri"));
    await saludar(fixture);

    expect(raizDe(fixture).querySelector(".demo__result")).toBeNull();
    expect(raizDe(fixture).querySelector(".demo__error")?.textContent).toContain(
      "greetApi.greet: TypeError: sin Tauri",
    );
  });

  it("apaga el indicador de carga aunque la llamada falle", async () => {
    vi.mocked(invoke).mockRejectedValue("qué mal");
    const fixture = await montar();

    await saludar(fixture);

    const boton = raizDe(fixture).querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    expect(boton?.disabled).toBe(false);
  });
});
