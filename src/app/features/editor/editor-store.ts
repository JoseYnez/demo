import { computed, Service, signal } from "@angular/core";
import { EditorState } from "@codemirror/state";

import { ArchivoTexto, Documento } from "../../models/documento.model";
import type { SqlDialect } from "../../shared/ui";
import { fileApi } from "../../tauri";

export interface Apertura {
  id: string;
  contenido: string;
  nueva: boolean;
}

@Service()
export class EditorStore {
  readonly #documentos = signal<readonly Documento[]>([]);
  readonly documentos = this.#documentos.asReadonly();

  readonly #activoId = signal<string | null>(null);
  readonly activoId = this.#activoId.asReadonly();

  readonly activo = computed(
    () => this.#documentos().find((d) => d.id === this.#activoId()) ?? null,
  );

  readonly haySucios = computed(() => this.#documentos().some((d) => d.sucio));

  readonly #mensaje = signal<string | null>(null);
  readonly mensaje = this.#mensaje.asReadonly();

  readonly #estados = new Map<string, EditorState>();
  #siguienteNumero = 1;
  #siguienteId = 1;

  crearNuevo(): string {
    const id = String(this.#siguienteId++);
    const documento: Documento = {
      id,
      ruta: null,
      nombre: `sin-titulo-${this.#siguienteNumero++}.sql`,
      sucio: false,
      eol: "crlf",
      codificacion: "utf8",
      dialecto: "tsql",
    };
    this.#documentos.update((docs) => [...docs, documento]);
    this.activar(id);
    return id;
  }

  async abrirDesdeDisco(): Promise<Apertura | null> {
    const ruta = await fileApi.openDialog();
    if (!ruta) {
      return null;
    }
    const existente = this.#documentos().find((d) => d.ruta === ruta);
    if (existente) {
      this.activar(existente.id);
      return { id: existente.id, contenido: "", nueva: false };
    }
    let archivo: ArchivoTexto;
    try {
      archivo = await fileApi.read(ruta);
    } catch (e) {
      this.#mensaje.set(this.legible(e));
      return null;
    }
    const id = String(this.#siguienteId++);
    const documento: Documento = {
      id,
      ruta,
      nombre: this.nombreDe(ruta),
      sucio: false,
      eol: archivo.eol,
      codificacion: archivo.codificacion,
      dialecto: "tsql",
    };
    this.#documentos.update((docs) => [...docs, documento]);
    this.activar(id);
    return { id, contenido: archivo.contenido, nueva: true };
  }

  async guardar(id: string, texto: string, comoNuevo = false): Promise<boolean> {
    const documento = this.documento(id);
    if (!documento) {
      return false;
    }
    let ruta = documento.ruta;
    if (!ruta || comoNuevo) {
      ruta = await fileApi.saveDialog(documento.nombre);
      if (!ruta) {
        return false;
      }
    }
    try {
      await fileApi.write(ruta, texto, documento.eol, documento.codificacion);
    } catch (e) {
      this.#mensaje.set(this.legible(e));
      return false;
    }
    const destino = ruta;
    this.actualizar(id, (d) => ({
      ...d,
      ruta: destino,
      nombre: this.nombreDe(destino),
      sucio: false,
    }));
    this.#mensaje.set(null);
    return true;
  }

  async cerrar(id: string): Promise<boolean> {
    const documento = this.documento(id);
    if (!documento) {
      return false;
    }
    if (documento.sucio && !(await fileApi.confirmarDescarte())) {
      return false;
    }
    const docs = this.#documentos();
    const indice = docs.findIndex((d) => d.id === id);
    const restantes = docs.filter((d) => d.id !== id);
    this.#documentos.set(restantes);
    this.#estados.delete(id);
    if (this.#activoId() === id) {
      const vecino = restantes[Math.min(indice, restantes.length - 1)];
      this.#activoId.set(vecino?.id ?? null);
    }
    return true;
  }

  activar(id: string): void {
    if (this.documento(id)) {
      this.#activoId.set(id);
    }
  }

  marcarSucio(id: string): void {
    const documento = this.documento(id);
    if (documento && !documento.sucio) {
      this.actualizar(id, (d) => ({ ...d, sucio: true }));
    }
  }

  cambiarDialecto(id: string, dialecto: SqlDialect): void {
    this.actualizar(id, (d) => ({ ...d, dialecto }));
  }

  guardarEstado(id: string, estado: EditorState): void {
    this.#estados.set(id, estado);
  }

  estadoDe(id: string): EditorState | undefined {
    return this.#estados.get(id);
  }

  avisar(texto: string): void {
    this.#mensaje.set(texto);
  }

  private documento(id: string): Documento | undefined {
    return this.#documentos().find((d) => d.id === id);
  }

  private actualizar(id: string, cambio: (d: Documento) => Documento): void {
    this.#documentos.update((docs) =>
      docs.map((d) => (d.id === id ? cambio(d) : d)),
    );
  }

  private nombreDe(ruta: string): string {
    return ruta.split(/[\\/]/).at(-1) ?? ruta;
  }

  private legible(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
