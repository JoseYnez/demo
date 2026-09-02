import { TestBed } from "@angular/core/testing";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Contact, ContactDraft } from "../../models/contact.model";
import { ContactStore } from "./contact-store";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: () => false,
}));

const ADA: Contact = {
  id: 1,
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "admin",
  notes: "",
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

const BEA: Contact = {
  id: 3,
  name: "Bea Ruiz",
  email: "bea@example.com",
  role: "editor",
  notes: "",
  createdAt: 1_700_000_000_002,
};

const BORRADOR: ContactDraft = {
  name: "Bea Ruiz",
  email: "bea@example.com",
  role: "editor",
  notes: "",
};

describe("ContactStore", () => {
  let store: ContactStore;

  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ContactStore] });
    store = TestBed.inject(ContactStore);
  });

  it("arranca vacío y sin cargar", () => {
    expect(store.items()).toEqual([]);
    expect(store.count()).toBe(0);
    expect(store.loading()).toBe(false);
  });

  it("ordena por nombre lo que devuelve el backend", async () => {
    vi.mocked(invoke).mockResolvedValue([ZOE, ADA]);

    await store.load();

    expect(store.items().map((c) => c.name)).toEqual([ADA.name, ZOE.name]);
    expect(store.count()).toBe(2);
    expect(invoke).toHaveBeenCalledWith("list_contacts");
  });

  it("coloca en su sitio el contacto creado sin volver a pedir la lista", async () => {
    vi.mocked(invoke).mockResolvedValueOnce([ADA, ZOE]);
    await store.load();

    vi.mocked(invoke).mockResolvedValueOnce(BEA);
    await store.create(BORRADOR);

    expect(store.items().map((c) => c.name)).toEqual([
      ADA.name,
      BEA.name,
      ZOE.name,
    ]);
    expect(invoke).toHaveBeenLastCalledWith("create_contact", {
      draft: BORRADOR,
    });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("sustituye el contacto editado y lo reordena", async () => {
    vi.mocked(invoke).mockResolvedValueOnce([ADA, ZOE]);
    await store.load();

    const renombrada = { ...ADA, name: "Zzz Lovelace" };
    vi.mocked(invoke).mockResolvedValueOnce(renombrada);
    await store.update(ADA.id, { ...BORRADOR, name: renombrada.name });

    expect(store.items().map((c) => c.name)).toEqual([
      ZOE.name,
      renombrada.name,
    ]);
    expect(invoke).toHaveBeenLastCalledWith("update_contact", {
      id: ADA.id,
      draft: { ...BORRADOR, name: renombrada.name },
    });
  });

  it("quita de la lista el contacto borrado", async () => {
    vi.mocked(invoke).mockResolvedValueOnce([ADA, ZOE]);
    await store.load();

    vi.mocked(invoke).mockResolvedValueOnce(ADA.id);
    await store.remove(ADA.id);

    expect(store.items().map((c) => c.name)).toEqual([ZOE.name]);
    expect(invoke).toHaveBeenLastCalledWith("delete_contact", { id: ADA.id });
  });

  it("relanza el mensaje del backend sin el prefijo del wrapper", async () => {
    vi.mocked(invoke).mockRejectedValue("Ya hay un contacto con ese correo.");

    await expect(store.create(BORRADOR)).rejects.toThrow(
      "Ya hay un contacto con ese correo.",
    );
    expect(store.items()).toEqual([]);
  });

  it("conserva el contexto cuando el fallo no viene del backend", async () => {
    vi.mocked(invoke).mockRejectedValue(new TypeError("sin Tauri"));

    await expect(store.load()).rejects.toThrow(
      "contactApi.list: TypeError: sin Tauri",
    );
  });

  it("apaga el indicador de carga aunque la lista falle", async () => {
    vi.mocked(invoke).mockRejectedValue("Error interno: qué mal.");

    await store.load().catch(() => undefined);

    expect(store.loading()).toBe(false);
  });
});
