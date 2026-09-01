import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { beforeEach, describe, expect, it } from "vitest";

import { CodeEditor } from "../../shared/ui";
import { Editor } from "./editor";
import { EditorStore } from "./editor-store";

describe("Editor", () => {
  let store: EditorStore;

  beforeEach(() => {
    TestBed.resetTestingModule();
    store = TestBed.inject(EditorStore);
  });

  async function montar() {
    const fixture = TestBed.createComponent(Editor);
    await fixture.whenStable();
    const editor = fixture.debugElement.query(By.directive(CodeEditor))
      .componentInstance as CodeEditor;
    return { fixture, editor };
  }

  it("abre con un documento nuevo si no había ninguno", async () => {
    await montar();

    expect(store.documentos().length).toBe(1);
    expect(store.activo()?.nombre).toBe("sin-titulo-1.sql");
  });

  it("retiene el documento al destruirse la pantalla", async () => {
    const { fixture, editor } = await montar();
    const id = store.activoId();
    editor.replaceAll("SELECT 'no debo perderme';");

    fixture.destroy();

    expect(store.estadoDe(id!)?.doc.toString()).toBe("SELECT 'no debo perderme';");
  });

  it("restaura el texto al volver a montar la pantalla", async () => {
    const primera = await montar();
    primera.editor.replaceAll("SELECT 1;");
    primera.fixture.destroy();

    const segunda = await montar();

    expect(segunda.editor.getText()).toBe("SELECT 1;");
    expect(store.documentos().length).toBe(1);
  });

  it("cada pestaña conserva su propio texto al alternar", async () => {
    const { fixture, editor } = await montar();
    editor.replaceAll("SELECT 'uno';");
    const uno = store.activoId();

    fixture.nativeElement.querySelector(".tabs__nueva").click();
    await fixture.whenStable();
    editor.replaceAll("SELECT 'dos';");
    const dos = store.activoId();

    const pestanas = fixture.nativeElement.querySelectorAll(".tabs__nombre");
    pestanas[0].click();
    await fixture.whenStable();

    expect(store.activoId()).toBe(uno);
    expect(editor.getText()).toBe("SELECT 'uno';");

    pestanas[1].click();
    await fixture.whenStable();

    expect(store.activoId()).toBe(dos);
    expect(editor.getText()).toBe("SELECT 'dos';");
  });

  it("crear una pestaña no ensucia la nueva ni pierde la anterior", async () => {
    const { fixture, editor } = await montar();
    editor.replaceAll("SELECT 1;");

    fixture.nativeElement.querySelector(".tabs__nueva").click();
    await fixture.whenStable();

    const [anterior, nueva] = store.documentos();
    expect(anterior.sucio).toBe(true);
    expect(nueva.sucio).toBe(false);
    expect(editor.getText()).toBe("");
  });

  it("formatear deja el aviso y el documento intactos si el SQL no compila", async () => {
    const { fixture, editor } = await montar();
    editor.replaceAll("SELECT 'sin cerrar");

    const boton = [
      ...fixture.nativeElement.querySelectorAll("button"),
    ].find((b: HTMLButtonElement) => b.textContent?.includes("Formatear"));
    boton.click();
    await fixture.whenStable();

    expect(editor.getText()).toBe("SELECT 'sin cerrar");
    expect(store.mensaje()).toContain("No se pudo formatear");
  });

  it("el aviso no sobrevive al cambio de pestaña", async () => {
    const { fixture } = await montar();
    store.avisar("algo salió mal");

    fixture.nativeElement.querySelector(".tabs__nueva").click();
    await fixture.whenStable();

    expect(store.mensaje()).toBeNull();
  });

  it("fuera de Tauri, guardar avisa en vez de reventar", async () => {
    const { fixture } = await montar();

    fixture.nativeElement.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true }),
    );
    await fixture.whenStable();

    expect(store.mensaje()).toContain("app de escritorio");
  });
});
