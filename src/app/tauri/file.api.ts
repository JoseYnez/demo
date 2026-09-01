import { invoke, isTauri } from "@tauri-apps/api/core";
import { ask, open, save } from "@tauri-apps/plugin-dialog";

import {
  ArchivoTexto,
  Codificacion,
  FinDeLinea,
} from "../models/documento.model";

const FILTROS = [
  { name: "SQL", extensions: ["sql"] },
  { name: "Todos los archivos", extensions: ["*"] },
];

export const fileApi = {
  enTauri: isTauri(),

  read: async (ruta: string): Promise<ArchivoTexto> => {
    try {
      return await invoke<ArchivoTexto>("read_text_file", { ruta });
    } catch (e) {
      throw new Error(`fileApi.read: ${e}`);
    }
  },

  write: async (
    ruta: string,
    contenido: string,
    eol: FinDeLinea,
    codificacion: Codificacion,
  ): Promise<void> => {
    try {
      await invoke("write_text_file", { ruta, contenido, eol, codificacion });
    } catch (e) {
      throw new Error(`fileApi.write: ${e}`);
    }
  },

  openDialog: async (): Promise<string | null> => {
    try {
      return await open({ multiple: false, filters: FILTROS });
    } catch (e) {
      throw new Error(`fileApi.openDialog: ${e}`);
    }
  },

  saveDialog: async (nombre: string): Promise<string | null> => {
    try {
      return await save({ defaultPath: nombre, filters: FILTROS });
    } catch (e) {
      throw new Error(`fileApi.saveDialog: ${e}`);
    }
  },

  confirmarDescarte: async (): Promise<boolean> => {
    try {
      return await ask("Hay cambios sin guardar. ¿Quieres descartarlos?", {
        title: "demo",
        kind: "warning",
        okLabel: "Descartar",
        cancelLabel: "Cancelar",
      });
    } catch (e) {
      throw new Error(`fileApi.confirmarDescarte: ${e}`);
    }
  },
};
