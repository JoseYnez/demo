import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Contact } from "../../../models/contact.model";
import { ContactStore } from "../contact-store";
import { ContactList } from "./contact-list";

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

const ZOE: Contact = {
  id: 2,
  name: "Zoe Nolan",
  email: "zoe@example.com",
  role: "viewer",
  notes: "",
  createdAt: 1_700_000_000_001,
};

async function montar(
  contactos: readonly Contact[] = [ADA, ZOE],
): Promise<ComponentFixture<ContactList>> {
  vi.mocked(invoke).mockResolvedValue(contactos);
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ContactList],
    providers: [ContactStore, provideRouter([])],
  }).compileComponents();
  const fixture = TestBed.createComponent(ContactList);
  await fixture.whenStable();
  return fixture;
}

function raizDe(fixture: ComponentFixture<ContactList>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function nombres(fixture: ComponentFixture<ContactList>): string[] {
  return Array.from(raizDe(fixture).querySelectorAll(".crud__nombre")).map(
    (fila) => fila.textContent?.trim() ?? "",
  );
}

async function pulsar(
  fixture: ComponentFixture<ContactList>,
  texto: string,
): Promise<void> {
  const boton = Array.from(raizDe(fixture).querySelectorAll("button")).find(
    (candidato) => candidato.textContent?.trim().startsWith(texto),
  );
  boton?.click();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

async function buscar(
  fixture: ComponentFixture<ContactList>,
  texto: string,
): Promise<void> {
  const buscador = raizDe(fixture).querySelector<HTMLInputElement>(
    ".crud__buscador input",
  )!;
  buscador.value = texto;
  buscador.dispatchEvent(new Event("input"));
  await fixture.whenStable();
}

describe("ContactList", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("pide la lista al abrirse y la muestra", async () => {
    const fixture = await montar();

    expect(invoke).toHaveBeenCalledWith("list_contacts");
    expect(nombres(fixture)).toEqual([ADA.name, ZOE.name]);
    expect(raizDe(fixture).textContent).toContain("2 contactos");
  });

  it("filtra por nombre y por correo sin volver al backend", async () => {
    const fixture = await montar();

    await buscar(fixture, "zoe@");

    expect(nombres(fixture)).toEqual([ZOE.name]);
    expect(raizDe(fixture).textContent).toContain("1 de 2");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("avisa cuando la búsqueda no encuentra nada", async () => {
    const fixture = await montar();

    await buscar(fixture, "nadie");

    expect(raizDe(fixture).textContent).toContain("Ningún contacto coincide");
  });

  it("ofrece crear el primero cuando la lista está vacía", async () => {
    const fixture = await montar([]);

    expect(raizDe(fixture).textContent).toContain("Todavía no hay contactos");
  });

  it("enlaza a la ficha de cada contacto en vez de abrir un formulario", async () => {
    const fixture = await montar();

    const raiz = raizDe(fixture);
    expect(raiz.querySelector("form")).toBeNull();
    const destinos = Array.from(
      raiz.querySelectorAll<HTMLAnchorElement>(".crud__acciones-fila a"),
    ).map((enlace) => enlace.getAttribute("href"));
    expect(destinos).toEqual(["/contacts/1", "/contacts/2"]);
  });

  it("no borra hasta que se confirma", async () => {
    const fixture = await montar();

    await pulsar(fixture, "Eliminar");

    expect(raizDe(fixture).textContent).toContain("¿Eliminar?");
    expect(invoke).toHaveBeenCalledTimes(1);

    vi.mocked(invoke).mockResolvedValue(ADA.id);
    await pulsar(fixture, "Sí, eliminar");

    expect(invoke).toHaveBeenLastCalledWith("delete_contact", { id: ADA.id });
    expect(nombres(fixture)).toEqual([ZOE.name]);
  });

  it("cancelar deja el contacto en la lista", async () => {
    const fixture = await montar();

    await pulsar(fixture, "Eliminar");
    await pulsar(fixture, "No");

    expect(raizDe(fixture).textContent).not.toContain("¿Eliminar?");
    expect(nombres(fixture)).toEqual([ADA.name, ZOE.name]);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("enseña el fallo del backend si la lista no llega", async () => {
    vi.mocked(invoke).mockRejectedValue("Error interno: qué mal.");
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ContactList],
      providers: [ContactStore, provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ContactList);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    const aviso = raizDe(fixture).querySelector('[role="alert"]');
    expect(aviso?.textContent).toContain("Error interno: qué mal.");
  });
});
