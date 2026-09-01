import { ComponentFixture, TestBed } from "@angular/core/testing";

import { CodeEditor } from "./code-editor";

describe("CodeEditor", () => {
  async function crear(
    inputs: Partial<Record<"value" | "dialect" | "externalState" | "disabled", unknown>> = {},
  ): Promise<ComponentFixture<CodeEditor>> {
    const fixture = TestBed.createComponent(CodeEditor);
    for (const [nombre, valor] of Object.entries(inputs)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    await fixture.whenStable();
    return fixture;
  }

  it("monta la vista con el contenido inicial", async () => {
    const fixture = await crear({ value: "SELECT 1;" });

    const contenido = fixture.nativeElement.querySelector(".cm-content");
    expect(contenido?.textContent).toContain("SELECT 1;");
  });

  it("sincroniza las ediciones hacia el modelo y emite edited", async () => {
    const fixture = await crear();
    const ediciones: void[] = [];
    fixture.componentInstance.edited.subscribe(() => ediciones.push(undefined));

    fixture.componentInstance.replaceAll("SELECT 2;");

    expect(fixture.componentInstance.value()).toBe("SELECT 2;");
    expect(ediciones.length).toBe(1);
  });

  it("aplica un valor externo del modelo a la vista", async () => {
    const fixture = await crear({ value: "SELECT 1;" });

    fixture.componentRef.setInput("value", "SELECT 99;");
    await fixture.whenStable();

    expect(fixture.componentInstance.getText()).toBe("SELECT 99;");
  });

  it("con externalState no escribe en el modelo", async () => {
    const fixture = await crear({ externalState: true });

    fixture.componentInstance.replaceAll("SELECT 3;");

    expect(fixture.componentInstance.value()).toBe("");
    expect(fixture.componentInstance.getText()).toBe("SELECT 3;");
  });

  it("cambia de estado y cada documento conserva su texto", async () => {
    const fixture = await crear({ externalState: true });
    const editor = fixture.componentInstance;

    const uno = editor.createState("SELECT 'uno';");
    const dos = editor.createState("SELECT 'dos';", "postgresql");

    editor.setState(uno);
    expect(editor.getText()).toBe("SELECT 'uno';");

    editor.setState(dos);
    expect(editor.getText()).toBe("SELECT 'dos';");

    editor.setState(uno);
    expect(editor.getText()).toBe("SELECT 'uno';");
  });

  it("emite la posición del cursor", async () => {
    const fixture = await crear();
    const posiciones: { line: number; column: number }[] = [];
    fixture.componentInstance.cursor.subscribe((p) => posiciones.push(p));

    fixture.componentInstance.replaceAll("SELECT 1;\nSELECT 2;");
    expect(posiciones.at(-1)).toEqual({ line: 1, column: 1 });

    fixture.componentInstance.replaceAll("SELECT 1;\nSELECT 2;\n", true);
    expect(posiciones.at(-1)).toEqual({ line: 3, column: 1 });
  });

  it("reconfigura el dialecto sin perder el documento", async () => {
    const fixture = await crear({ value: "SELECT TOP 5 * FROM t;" });

    fixture.componentRef.setInput("dialect", "postgresql");
    await fixture.whenStable();

    expect(fixture.componentInstance.getText()).toBe("SELECT TOP 5 * FROM t;");
  });

  it("deshabilitado rechaza ediciones del usuario pero no las programáticas", async () => {
    const fixture = await crear({ value: "SELECT 1;", disabled: true });

    const estado = fixture.componentInstance.getState();
    expect(estado.readOnly).toBe(true);
  });
});
