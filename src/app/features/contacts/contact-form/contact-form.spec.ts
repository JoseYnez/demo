import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Contact } from "../../../models/contact.model";
import { ContactStore } from "../contact-store";
import { ContactForm } from "./contact-form";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: () => false,
}));

const ADA: Contact = {
  id: 1,
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "admin",
  notes: "Cuenta de prueba.",
  createdAt: 1_700_000_000_000,
};

async function montar(id?: string): Promise<ComponentFixture<ContactForm>> {
  vi.mocked(invoke).mockResolvedValue([ADA]);
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ContactForm],
    providers: [ContactStore, provideRouter([])],
  }).compileComponents();
  const fixture = TestBed.createComponent(ContactForm);
  if (id !== undefined) {
    fixture.componentRef.setInput("id", id);
  }
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  return fixture;
}

function raizDe(fixture: ComponentFixture<ContactForm>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function valores(fixture: ComponentFixture<ContactForm>): string[] {
  return Array.from(
    raizDe(fixture).querySelectorAll<HTMLInputElement>("form input"),
  ).map((campo) => campo.value);
}

async function escribirNombre(
  fixture: ComponentFixture<ContactForm>,
  texto: string,
): Promise<void> {
  const campo = raizDe(fixture).querySelector<HTMLInputElement>("form input")!;
  campo.value = texto;
  campo.dispatchEvent(new Event("input"));
  await fixture.whenStable();
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("abre vacío cuando no hay id en la ruta", async () => {
    const fixture = await montar();

    expect(raizDe(fixture).textContent).toContain("Nuevo contacto");
    expect(valores(fixture)).toEqual(["", ""]);
  });

  it("abre relleno con el contacto de la ruta", async () => {
    const fixture = await montar("1");

    expect(raizDe(fixture).textContent).toContain("Editar contacto");
    expect(valores(fixture)).toEqual([ADA.name, ADA.email]);
  });

  it("avisa cuando el id de la ruta ya no existe", async () => {
    const fixture = await montar("99");

    expect(raizDe(fixture).textContent).toContain("Ese contacto ya no existe");
    expect(raizDe(fixture).querySelector("form")).toBeNull();
  });

  it("deja salir sin preguntar si no se ha tocado nada", async () => {
    const fixture = await montar("1");

    expect(fixture.componentInstance.puedeSalir()).toBe(true);
    expect(raizDe(fixture).querySelector("dialog")?.open).toBeFalsy();
  });

  it("pregunta antes de salir con cambios y se queda si se sigue editando", async () => {
    const fixture = await montar("1");
    await escribirNombre(fixture, "Ada L.");

    const decision = fixture.componentInstance.puedeSalir();
    await fixture.whenStable();

    expect(raizDe(fixture).textContent).toContain("Hay cambios sin guardar");

    const seguir = Array.from(
      raizDe(fixture).querySelectorAll("button"),
    ).find((boton) => boton.textContent?.includes("Seguir editando"));
    seguir?.click();
    await fixture.whenStable();

    await expect(decision).resolves.toBe(false);
  });

  it("descartar deja salir", async () => {
    const fixture = await montar("1");
    await escribirNombre(fixture, "Ada L.");

    const decision = fixture.componentInstance.puedeSalir();
    await fixture.whenStable();

    const descartar = Array.from(
      raizDe(fixture).querySelectorAll("button"),
    ).find((boton) => boton.textContent?.includes("Descartar"));
    descartar?.click();
    await fixture.whenStable();

    await expect(decision).resolves.toBe(true);
  });

  it("guarda y vuelve a la lista sin volver a preguntar", async () => {
    const fixture = await montar("1");
    await escribirNombre(fixture, "Ada L.");

    const navegar = vi.spyOn(TestBed.inject(Router), "navigate");
    vi.mocked(invoke).mockResolvedValue({ ...ADA, name: "Ada L." });

    const boton = Array.from(raizDe(fixture).querySelectorAll("button")).find(
      (candidato) => candidato.textContent?.includes("Guardar cambios"),
    )!;
    boton.click();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    expect(invoke).toHaveBeenLastCalledWith("update_contact", {
      id: ADA.id,
      draft: { name: "Ada L.", email: ADA.email, role: ADA.role, notes: ADA.notes },
    });
    expect(navegar).toHaveBeenCalledWith(["/contacts"]);
    expect(fixture.componentInstance.puedeSalir()).toBe(true);
  });
});
