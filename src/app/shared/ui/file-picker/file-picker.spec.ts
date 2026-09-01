import { ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FilePicker, RejectedFile } from "./file-picker";

describe("FilePicker", () => {
  let fixture: ComponentFixture<FilePicker>;
  let rechazos: RejectedFile[];
  let revocadas: string[];
  let creadas: number;

  beforeEach(() => {
    creadas = 0;
    revocadas = [];
    URL.createObjectURL = vi.fn(() => `blob:${++creadas}`);
    URL.revokeObjectURL = vi.fn((url: string) => void revocadas.push(url));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function crear(
    entradas: Record<string, unknown> = {},
  ): Promise<ComponentFixture<FilePicker>> {
    const nuevo = TestBed.createComponent(FilePicker);
    for (const [nombre, valor] of Object.entries(entradas)) {
      nuevo.componentRef.setInput(nombre, valor);
    }
    await nuevo.whenStable();
    return nuevo;
  }

  async function montar(entradas: Record<string, unknown> = {}): Promise<void> {
    fixture = await crear(entradas);
    rechazos = [];
    fixture.componentInstance.rejected.subscribe((lote) => rechazos.push(...lote));
    await fixture.whenStable();
  }

  function archivo(
    nombre: string,
    { bytes = 4, tipo = "text/plain", fecha = 1 } = {},
  ): File {
    return new File(["x".repeat(bytes)], nombre, { type: tipo, lastModified: fecha });
  }

  function conArchivos(
    tipo: string,
    archivos: readonly File[],
    carpetas: readonly string[] = [],
  ): Event {
    const evento = new Event(tipo, { bubbles: true, cancelable: true });
    const items = archivos.map((file) => ({
      kind: "file",
      webkitGetAsEntry: () => ({ isDirectory: carpetas.includes(file.name) }),
    }));
    Object.defineProperty(evento, "dataTransfer", {
      value: { files: archivos, items, types: ["Files"], dropEffect: "none" },
    });
    return evento;
  }

  function pegado(archivos: readonly File[]): Event {
    const evento = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(evento, "clipboardData", { value: { files: archivos } });
    return evento;
  }

  const raiz = () => fixture.nativeElement as HTMLElement;
  const zona = () => raiz().querySelector(".fp__zone")!;
  const campo = () => raiz().querySelector<HTMLInputElement>(".fp__campo")!;
  const nombres = () => fixture.componentInstance.value().map((file) => file.name);

  async function soltar(
    archivos: readonly File[],
    carpetas: readonly string[] = [],
  ): Promise<void> {
    zona().dispatchEvent(conArchivos("drop", archivos, carpetas));
    await fixture.whenStable();
  }

  it("adjunta los archivos que se sueltan en la zona", async () => {
    await montar();
    await soltar([archivo("uno.txt"), archivo("dos.txt")]);
    expect(nombres()).toEqual(["uno.txt", "dos.txt"]);
  });

  it("ignora el drop cuando no se declaró la fuente", async () => {
    await montar({ sources: ["browse"] });
    await soltar([archivo("uno.txt")]);
    expect(nombres()).toEqual([]);
  });

  it("ignora el drop cuando está deshabilitado", async () => {
    await montar({ disabled: true });
    await soltar([archivo("uno.txt")]);
    expect(nombres()).toEqual([]);
  });

  it("filtra por accept, que el atributo nativo no aplica a lo soltado", async () => {
    await montar({ accept: "image/*,.pdf" });
    await soltar([
      archivo("foto.png", { tipo: "image/png" }),
      archivo("hoja.pdf", { tipo: "" }),
      archivo("notas.txt"),
    ]);

    expect(nombres()).toEqual(["foto.png", "hoja.pdf"]);
    expect(rechazos.map((r) => [r.file.name, r.reason])).toEqual([
      ["notas.txt", "type"],
    ]);
  });

  it("rechaza el archivo que supera maxSize", async () => {
    await montar({ maxSize: 10 });
    await soltar([archivo("grande.txt", { bytes: 11 }), archivo("cabe.txt")]);

    expect(nombres()).toEqual(["cabe.txt"]);
    expect(rechazos.map((r) => r.reason)).toEqual(["size"]);
  });

  it("rechaza a partir de maxFiles contando los ya adjuntos", async () => {
    await montar({ maxFiles: 2 });
    await soltar([archivo("uno.txt")]);
    await soltar([archivo("dos.txt"), archivo("tres.txt")]);

    expect(nombres()).toEqual(["uno.txt", "dos.txt"]);
    expect(rechazos.map((r) => [r.file.name, r.reason])).toEqual([
      ["tres.txt", "count"],
    ]);
  });

  it("no admite dos veces el mismo archivo", async () => {
    await montar();
    await soltar([archivo("uno.txt")]);
    await soltar([archivo("uno.txt")]);

    expect(nombres()).toEqual(["uno.txt"]);
    expect(rechazos.map((r) => r.reason)).toEqual(["duplicate"]);
  });

  it("con maxFiles 1 el nuevo archivo reemplaza al anterior", async () => {
    await montar({ maxFiles: 1 });
    await soltar([archivo("uno.txt")]);
    await soltar([archivo("dos.txt")]);

    expect(nombres()).toEqual(["dos.txt"]);
    expect(rechazos).toEqual([]);
  });

  it("deriva multiple de maxFiles en vez de tener su propia perilla", async () => {
    await montar({ maxFiles: 1 });
    expect(campo().multiple).toBe(false);

    fixture.componentRef.setInput("maxFiles", 3);
    await fixture.whenStable();
    expect(campo().multiple).toBe(true);
  });

  it("limpia el input tras elegir, o el mismo archivo no vuelve a emitir change", async () => {
    await montar();
    const input = campo();
    Object.defineProperty(input, "files", {
      value: [archivo("uno.txt")],
      configurable: true,
    });

    input.dispatchEvent(new Event("change", { bubbles: true }));
    await fixture.whenStable();

    expect(nombres()).toEqual(["uno.txt"]);
    expect(input.value).toBe("");
  });

  it("adjunta lo pegado desde el portapapeles", async () => {
    await montar();
    zona().dispatchEvent(pegado([archivo("captura.png", { tipo: "image/png" })]));
    await fixture.whenStable();

    expect(nombres()).toEqual(["captura.png"]);
  });

  it("ignora el pegado cuando no se declaró la fuente", async () => {
    await montar({ sources: ["drop"] });
    zona().dispatchEvent(pegado([archivo("captura.png", { tipo: "image/png" })]));
    await fixture.whenStable();

    expect(nombres()).toEqual([]);
  });

  it("pasar sobre un hijo no apaga el resaltado de arrastre", async () => {
    await montar();
    const hijo = raiz().querySelector(".fp__text")!;

    zona().dispatchEvent(conArchivos("dragenter", []));
    hijo.dispatchEvent(conArchivos("dragenter", []));
    hijo.dispatchEvent(new Event("dragleave", { bubbles: true }));
    await fixture.whenStable();

    expect(zona().classList.contains("is-over")).toBe(true);
  });

  it("apaga el resaltado al soltar", async () => {
    await montar();
    zona().dispatchEvent(conArchivos("dragenter", []));
    await fixture.whenStable();
    expect(zona().classList.contains("is-over")).toBe(true);

    await soltar([archivo("uno.txt")]);
    expect(zona().classList.contains("is-over")).toBe(false);
  });

  it("emite touch al salir el foco de la zona", async () => {
    await montar();
    let tocado = 0;
    fixture.componentInstance.touch.subscribe(() => tocado++);

    zona().dispatchEvent(new FocusEvent("blur"));
    await fixture.whenStable();

    expect(tocado).toBe(1);
  });

  it("crea miniatura sólo para imágenes y la revoca al quitar el archivo", async () => {
    await montar();
    await soltar([archivo("foto.png", { tipo: "image/png" }), archivo("notas.txt")]);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(raiz().querySelectorAll(".fp__thumb").length).toBe(1);
    expect(raiz().querySelector(".fp__ext")?.textContent?.trim()).toBe("TXT");

    raiz().querySelector<HTMLButtonElement>(".fp__remove")!.click();
    await fixture.whenStable();

    expect(revocadas).toEqual(["blob:1"]);
  });

  it("no crea miniaturas con preview desactivado", async () => {
    await montar({ preview: false });
    await soltar([archivo("foto.png", { tipo: "image/png" })]);

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(raiz().querySelectorAll(".fp__thumb").length).toBe(0);
  });

  it("revoca las miniaturas pendientes al destruirse", async () => {
    await montar();
    await soltar([archivo("foto.png", { tipo: "image/png" })]);
    expect(revocadas).toEqual([]);

    fixture.destroy();
    expect(revocadas).toEqual(["blob:1"]);
  });

  it("enseña el aviso del rechazo en la línea de mensaje", async () => {
    await montar({ maxSize: 1 });
    await soltar([archivo("grande.txt", { bytes: 11 })]);

    expect(raiz().querySelector(".ui-msg--aviso")?.textContent?.trim()).toBe(
      "1 archivo sin adjuntar: supera el tamaño máximo.",
    );
  });

  it("el error del formulario tiene prioridad sobre el aviso del rechazo", async () => {
    await montar({ maxSize: 1, touched: true });
    fixture.componentRef.setInput("errors", [
      { kind: "required", message: "Adjunta al menos un archivo." },
    ]);
    await soltar([archivo("grande.txt", { bytes: 11 })]);

    expect(raiz().querySelector(".ui-msg--error")?.textContent?.trim()).toBe(
      "Adjunta al menos un archivo.",
    );
  });


  it("acepta todo con el comodín universal, igual que el atributo nativo", async () => {
    await montar({ accept: "*/*" });
    await soltar([archivo("notas.txt"), archivo("foto.png", { tipo: "image/png" })]);

    expect(nombres()).toEqual(["notas.txt", "foto.png"]);
    expect(rechazos).toEqual([]);
  });

  it("describe el accept en vez de enseñar su sintaxis", async () => {
    await montar({ accept: "image/*,.pdf" });
    expect(raiz().querySelector(".fp__pista")?.textContent).toContain("imágenes, PDF");
  });

  it("no adjunta las carpetas que se sueltan", async () => {
    await montar();
    await soltar([archivo("informes"), archivo("uno.txt")], ["informes"]);

    expect(nombres()).toEqual(["uno.txt"]);
    expect(rechazos.map((r) => [r.file.name, r.reason])).toEqual([
      ["informes", "folder"],
    ]);
  });

  it("anuncia el rechazo en una región viva que ya existía", async () => {
    await montar({ maxSize: 1 });
    const anuncio = raiz().querySelector('.sr-only[role="status"]')!;
    expect(anuncio.getAttribute("role")).toBe("status");
    expect(anuncio.textContent?.trim()).toBe("");

    await soltar([archivo("grande.txt", { bytes: 11 })]);
    expect(anuncio.textContent?.trim()).toBe(
      "1 archivo sin adjuntar: supera el tamaño máximo.",
    );
  });

  it("un rechazo avisa, pero no declara el campo inválido", async () => {
    await montar({ maxSize: 1 });
    expect(zona().getAttribute("aria-invalid")).toBe("false");

    await soltar([archivo("grande.txt", { bytes: 11 })]);
    expect(zona().getAttribute("aria-invalid")).toBe("false");
    expect(zona().classList.contains("is-aviso")).toBe(true);
  });

  it("marca la zona como inválida cuando el error viene del formulario", async () => {
    await montar({ touched: true });
    fixture.componentRef.setInput("errors", [
      { kind: "required", message: "Adjunta al menos un archivo." },
    ]);
    await fixture.whenStable();

    expect(zona().getAttribute("aria-invalid")).toBe("true");
  });

  it("liga la línea de mensaje al control con aria-describedby", async () => {
    await montar({ hint: "Obligatorio: al menos uno." });

    const id = zona().getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(raiz().querySelector(`#${id}`)?.textContent?.trim()).toBe(
      "Obligatorio: al menos uno.",
    );
  });

  it("da el nombre entero en el title, que la lista lo recorta", async () => {
    await montar();
    const largo = `${"nombre-larguísimo-".repeat(5)}.txt`;
    await soltar([archivo(largo)]);

    expect(raiz().querySelector(".fp__name")?.getAttribute("title")).toBe(largo);
  });

  it("quitar un archivo marca el campo como tocado", async () => {
    await montar();
    await soltar([archivo("uno.txt")]);

    let tocado = 0;
    fixture.componentInstance.touch.subscribe(() => tocado++);
    raiz().querySelector<HTMLButtonElement>(".fp__remove")!.click();
    await fixture.whenStable();

    expect(tocado).toBe(1);
  });

  it("el autorrepetir del teclado no reabre el explorador", async () => {
    await montar();
    const abrir = vi.spyOn(campo(), "click").mockImplementation(() => {});

    zona().dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", repeat: true, bubbles: true }),
    );
    await fixture.whenStable();

    expect(abrir).not.toHaveBeenCalled();
  });

  it("un nombre acabado en punto no deja la insignia vacía", async () => {
    await montar();
    await soltar([archivo("archivo.")]);

    expect(raiz().querySelector(".fp__ext")?.textContent?.trim()).toBe("?");
  });

  describe("reparto del pegado entre varios", () => {
    const zonaDe = (f: ComponentFixture<FilePicker>) =>
      (f.nativeElement as HTMLElement).querySelector<HTMLElement>(".fp__zone")!;
    const nombresDe = (f: ComponentFixture<FilePicker>) =>
      f.componentInstance.value().map((file) => file.name);

    async function pegarEn(destino: EventTarget): Promise<void> {
      destino.dispatchEvent(pegado([archivo("suelto.txt")]));
      await fixture.whenStable();
    }

    it("con uno solo en pantalla no hace falta ni enfocarlo", async () => {
      await montar();
      await pegarEn(document.body);
      expect(nombres()).toEqual(["suelto.txt"]);
    });

    it("no le roba el pegado a un campo de texto", async () => {
      await montar();
      const texto = document.createElement("input");
      document.body.appendChild(texto);

      await pegarEn(texto);
      texto.remove();

      expect(nombres()).toEqual([]);
    });

    it("con dos en pantalla gana el que tiene el foco", async () => {
      await montar();
      const otro = await crear();
      zonaDe(otro).dispatchEvent(new FocusEvent("focus"));
      await otro.whenStable();

      await pegarEn(document.body);

      expect(nombres()).toEqual([]);
      expect(nombresDe(otro)).toEqual(["suelto.txt"]);
    });

    it("con dos en pantalla y ninguno armado, no pega en ninguno", async () => {
      await montar();
      const otro = await crear();

      await pegarEn(document.body);

      expect(nombres()).toEqual([]);
      expect(nombresDe(otro)).toEqual([]);
    });

    it("con dos en pantalla, el que está bajo el cursor lo recibe", async () => {
      await montar();
      const otro = await crear();
      zonaDe(otro).dispatchEvent(new PointerEvent("pointerenter"));
      await otro.whenStable();

      await pegarEn(document.body);

      expect(nombres()).toEqual([]);
      expect(nombresDe(otro)).toEqual(["suelto.txt"]);
    });

    it("el foco manda sobre el cursor", async () => {
      await montar();
      const otro = await crear();
      zonaDe(fixture).dispatchEvent(new FocusEvent("focus"));
      zonaDe(otro).dispatchEvent(new PointerEvent("pointerenter"));
      await fixture.whenStable();
      await otro.whenStable();

      await pegarEn(document.body);

      expect(nombres()).toEqual(["suelto.txt"]);
      expect(nombresDe(otro)).toEqual([]);
    });

    it("al salir el cursor deja de estar armado", async () => {
      await montar();
      const otro = await crear();
      zonaDe(otro).dispatchEvent(new PointerEvent("pointerenter"));
      zonaDe(otro).dispatchEvent(new PointerEvent("pointerleave"));
      await otro.whenStable();

      await pegarEn(document.body);

      expect(nombres()).toEqual([]);
      expect(nombresDe(otro)).toEqual([]);
    });

    it("no le roba el pegado a quien ya lo consumió", async () => {
      await montar();
      const evento = pegado([archivo("suelto.txt")]);
      document.body.addEventListener("paste", (e) => e.preventDefault(), { once: true });

      document.body.dispatchEvent(evento);
      await fixture.whenStable();

      expect(nombres()).toEqual([]);
    });

    it("un contenteditable=\"false\" no es un campo de texto", async () => {
      await montar();
      const inerte = document.createElement("div");
      inerte.setAttribute("contenteditable", "false");
      document.body.appendChild(inerte);

      await pegarEn(inerte);
      inerte.remove();

      expect(nombres()).toEqual(["suelto.txt"]);
    });

    it("un adjuntador destruido deja de competir por el pegado", async () => {
      await montar();
      const otro = await crear();
      otro.destroy();

      await pegarEn(document.body);

      expect(nombres()).toEqual(["suelto.txt"]);
    });

    it("el que no admite pegar no compite, aunque sea el único enfocado", async () => {
      await montar({ sources: ["drop"] });
      const otro = await crear();
      zonaDe(fixture).dispatchEvent(new FocusEvent("focus"));
      await fixture.whenStable();

      await pegarEn(document.body);

      expect(nombres()).toEqual([]);
      expect(nombresDe(otro)).toEqual(["suelto.txt"]);
    });
  });

  it("abre el explorador con Enter y con Espacio", async () => {
    await montar();
    const abrir = vi.spyOn(campo(), "click").mockImplementation(() => {});

    zona().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    zona().dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await fixture.whenStable();

    expect(abrir).toHaveBeenCalledTimes(2);
  });

  it("deja inerte el input cuando no se declaró el explorador, o la etiqueta lo abriría", async () => {
    await montar({ sources: ["drop"], label: "Adjuntos" });
    expect(campo().disabled).toBe(true);

    fixture.componentRef.setInput("sources", ["drop", "browse"]);
    await fixture.whenStable();
    expect(campo().disabled).toBe(false);
  });

  it("no abre el explorador si no se declaró esa fuente", async () => {
    await montar({ sources: ["drop"] });
    const abrir = vi.spyOn(campo(), "click").mockImplementation(() => {});

    zona().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.whenStable();

    expect(abrir).not.toHaveBeenCalled();
    expect(zona().getAttribute("role")).toBe("group");
  });
});
