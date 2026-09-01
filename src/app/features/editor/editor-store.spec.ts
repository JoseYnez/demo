import { TestBed } from "@angular/core/testing";
import { EditorState } from "@codemirror/state";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EditorStore } from "./editor-store";
import { fileApi, windowApi } from "../../tauri";

const openDialog = vi.spyOn(fileApi, "openDialog");
const saveDialog = vi.spyOn(fileApi, "saveDialog");
const read = vi.spyOn(fileApi, "read");
const write = vi.spyOn(fileApi, "write");
const confirmarDescarte = vi.spyOn(fileApi, "confirmarDescarte");

describe("EditorStore", () => {
  let store: EditorStore;

  beforeEach(() => {
    vi.clearAllMocks();
    openDialog.mockResolvedValue(null);
    saveDialog.mockResolvedValue(null);
    read.mockRejectedValue(new Error("sin fixture"));
    write.mockResolvedValue(undefined);
    confirmarDescarte.mockResolvedValue(false);
    TestBed.resetTestingModule();
    store = TestBed.inject(EditorStore);
  });

  it("numera los documentos nuevos y activa el último", () => {
    const uno = store.crearNuevo();
    const dos = store.crearNuevo();

    expect(store.documentos().map((d) => d.nombre)).toEqual([
      "sin-titulo-1.sql",
      "sin-titulo-2.sql",
    ]);
    expect(store.activoId()).toBe(dos);
    expect(uno).not.toBe(dos);
  });

  it("marca sucio y guardar limpia con la ruta existente", async () => {
    write.mockResolvedValue(undefined);
    const id = store.crearNuevo();
    store.cambiarDialecto(id, "postgresql");
    store.marcarSucio(id);

    saveDialog.mockResolvedValue("C:\\sql\\consulta.sql");
    const ok = await store.guardar(id, "SELECT 1;\n");

    expect(ok).toBe(true);
    expect(write).toHaveBeenCalledWith(
      "C:\\sql\\consulta.sql",
      "SELECT 1;\n",
      "crlf",
      "utf8",
    );
    const documento = store.activo();
    expect(documento?.sucio).toBe(false);
    expect(documento?.nombre).toBe("consulta.sql");
    expect(documento?.ruta).toBe("C:\\sql\\consulta.sql");
    expect(documento?.dialecto).toBe("postgresql");
  });

  it("guardar cancelado en el diálogo no escribe ni limpia", async () => {
    const id = store.crearNuevo();
    store.marcarSucio(id);
    saveDialog.mockResolvedValue(null);

    const ok = await store.guardar(id, "SELECT 1;");

    expect(ok).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(store.activo()?.sucio).toBe(true);
  });

  it("guardar deja el error en mensaje cuando la escritura falla", async () => {
    const id = store.crearNuevo();
    saveDialog.mockResolvedValue("C:\\sql\\x.sql");
    write.mockRejectedValue(new Error("fileApi.write: io: denegado"));

    const ok = await store.guardar(id, "SELECT 1;");

    expect(ok).toBe(false);
    expect(store.mensaje()).toContain("denegado");
  });

  it("abrir reutiliza la pestaña si la ruta ya está abierta", async () => {
    openDialog.mockResolvedValue("C:\\sql\\a.sql");
    read.mockResolvedValue({
      contenido: "SELECT 1;\n",
      eol: "crlf",
      codificacion: "utf8bom",
    });

    const primera = await store.abrirDesdeDisco();
    store.crearNuevo();
    const segunda = await store.abrirDesdeDisco();

    expect(primera?.nueva).toBe(true);
    expect(segunda?.nueva).toBe(false);
    expect(segunda?.id).toBe(primera?.id);
    expect(store.documentos().length).toBe(2);
    expect(store.activoId()).toBe(primera?.id);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("abrir conserva eol y codificación del archivo", async () => {
    openDialog.mockResolvedValue("C:\\sql\\a.sql");
    read.mockResolvedValue({
      contenido: "SELECT 1;\n",
      eol: "lf",
      codificacion: "utf16le",
    });

    await store.abrirDesdeDisco();

    expect(store.activo()?.eol).toBe("lf");
    expect(store.activo()?.codificacion).toBe("utf16le");
  });

  it("cerrar un documento sucio respeta la cancelación", async () => {
    const id = store.crearNuevo();
    store.marcarSucio(id);
    confirmarDescarte.mockResolvedValue(false);

    expect(await store.cerrar(id)).toBe(false);
    expect(store.documentos().length).toBe(1);

    confirmarDescarte.mockResolvedValue(true);
    expect(await store.cerrar(id)).toBe(true);
    expect(store.documentos().length).toBe(0);
    expect(store.activoId()).toBeNull();
  });

  it("cerrar la pestaña activa pasa el foco a la vecina", async () => {
    const uno = store.crearNuevo();
    const dos = store.crearNuevo();
    const tres = store.crearNuevo();
    store.activar(dos);

    await store.cerrar(dos);

    expect(store.activoId()).toBe(tres);
    expect(store.documentos().map((d) => d.id)).toEqual([uno, tres]);
  });

  it("cerrar una pestaña de fondo no roba el foco", async () => {
    const uno = store.crearNuevo();
    const dos = store.crearNuevo();
    store.activar(dos);

    await store.cerrar(uno);

    expect(store.activoId()).toBe(dos);
  });

  it("guarda y devuelve el estado del editor por documento", () => {
    const id = store.crearNuevo();
    const estado = EditorState.create({ doc: "SELECT 1;" });

    store.guardarEstado(id, estado);

    expect(store.estadoDe(id)).toBe(estado);
    expect(store.estadoDe("otro")).toBeUndefined();
  });

  it("haySucios refleja el conjunto", () => {
    const id = store.crearNuevo();
    expect(store.haySucios()).toBe(false);

    store.marcarSucio(id);
    expect(store.haySucios()).toBe(true);
  });

  describe("guard de cierre de la ventana", () => {
    const onCloseRequested = vi.spyOn(windowApi, "onCloseRequested");

    async function guardCon(sucio: boolean, confirmar: boolean) {
      windowApi.enTauri = true;
      onCloseRequested.mockResolvedValue(() => {});
      TestBed.resetTestingModule();
      const conGuard = TestBed.inject(EditorStore);
      windowApi.enTauri = false;

      const id = conGuard.crearNuevo();
      if (sucio) {
        conGuard.marcarSucio(id);
      }
      confirmarDescarte.mockResolvedValue(confirmar);

      const handler = onCloseRequested.mock.calls.at(-1)?.[0];
      const preventDefault = vi.fn();
      await handler?.({ preventDefault } as never);
      return preventDefault;
    }

    it("sin cambios deja cerrar sin preguntar", async () => {
      const preventDefault = await guardCon(false, false);

      expect(preventDefault).not.toHaveBeenCalled();
      expect(confirmarDescarte).not.toHaveBeenCalled();
    });

    it("con cambios y cancelación impide el cierre", async () => {
      const preventDefault = await guardCon(true, false);

      expect(preventDefault).toHaveBeenCalled();
    });

    it("con cambios y descarte confirmado deja cerrar", async () => {
      const preventDefault = await guardCon(true, true);

      expect(preventDefault).not.toHaveBeenCalled();
    });
  });
});
