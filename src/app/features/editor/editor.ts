import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from "@angular/core";

import { KeyboardService } from "../../core/services/keyboard";
import { Button, CodeEditor, CursorPosition, SqlDialect } from "../../shared/ui";
import { fileApi } from "../../tauri";
import { DocumentTabs } from "./document-tabs/document-tabs";
import { EditorStore } from "./editor-store";
import { formatearSql } from "./sql/format";
import { StatusBar } from "./status-bar/status-bar";

@Component({
  selector: "app-editor",
  imports: [Button, CodeEditor, DocumentTabs, StatusBar],
  templateUrl: "./editor.html",
  styleUrl: "./editor.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Editor {
  protected readonly store = inject(EditorStore);
  private readonly teclado = inject(KeyboardService);
  private readonly editor = viewChild.required(CodeEditor);

  protected readonly enTauri = fileApi.enTauri;
  protected readonly cursor = signal<CursorPosition>({ line: 1, column: 1 });

  constructor() {
    this.teclado.register(
      {
        key: "s",
        ctrl: true,
        allowInEditable: true,
        description: "Guardar el documento activo",
      },
      () => void this.guardar(),
    );
    this.teclado.register(
      {
        key: "s",
        ctrl: true,
        shift: true,
        allowInEditable: true,
        description: "Guardar como…",
      },
      () => void this.guardarComo(),
    );
    this.teclado.register(
      {
        key: "f",
        shift: true,
        alt: true,
        allowInEditable: true,
        description: "Formatear el documento",
      },
      () => this.formatear(),
    );
  }

  protected alMontar(): void {
    if (this.store.documentos().length === 0) {
      this.crearDocumento();
    } else {
      this.mostrarActivo();
    }
  }

  protected nuevo(): void {
    this.retenerEstadoActivo();
    this.crearDocumento();
  }

  protected activar(id: string): void {
    if (id === this.store.activoId()) {
      return;
    }
    this.retenerEstadoActivo();
    this.store.activar(id);
    this.mostrarActivo();
  }

  protected async abrir(): Promise<void> {
    this.retenerEstadoActivo();
    const apertura = await this.store.abrirDesdeDisco();
    if (!apertura) {
      return;
    }
    if (apertura.nueva) {
      this.store.guardarEstado(
        apertura.id,
        this.editor().createState(apertura.contenido, this.store.activo()?.dialecto),
      );
    }
    this.mostrarActivo();
  }

  protected async guardar(): Promise<void> {
    const activo = this.store.activo();
    if (activo) {
      await this.store.guardar(activo.id, this.editor().getText());
    }
  }

  protected async guardarComo(): Promise<void> {
    const activo = this.store.activo();
    if (activo) {
      await this.store.guardar(activo.id, this.editor().getText(), true);
    }
  }

  protected async cerrarPestana(id: string): Promise<void> {
    const eraActiva = id === this.store.activoId();
    if (!(await this.store.cerrar(id))) {
      return;
    }
    if (this.store.documentos().length === 0) {
      this.crearDocumento();
    } else if (eraActiva) {
      this.mostrarActivo();
    }
  }

  protected formatear(): void {
    const activo = this.store.activo();
    if (!activo) {
      return;
    }
    try {
      this.editor().replaceAll(
        formatearSql(this.editor().getText(), activo.dialecto),
      );
    } catch {
      this.store.avisar("No se pudo formatear: revisa la sintaxis del documento.");
    }
  }

  protected cambiarDialecto(dialecto: SqlDialect): void {
    const activo = this.store.activo();
    if (activo) {
      this.store.cambiarDialecto(activo.id, dialecto);
    }
  }

  protected alEditar(): void {
    const activo = this.store.activo();
    if (activo) {
      this.store.marcarSucio(activo.id);
    }
  }

  private crearDocumento(): void {
    const id = this.store.crearNuevo();
    this.store.guardarEstado(id, this.editor().createState(""));
    this.mostrarActivo();
  }

  private retenerEstadoActivo(): void {
    const id = this.store.activoId();
    if (id) {
      this.store.guardarEstado(id, this.editor().getState());
    }
  }

  private mostrarActivo(): void {
    const id = this.store.activoId();
    const estado = id ? this.store.estadoDe(id) : undefined;
    if (estado) {
      this.editor().setState(estado);
      this.cursor.set(this.editor().cursorPosition());
      this.editor().focusView();
    }
  }
}
