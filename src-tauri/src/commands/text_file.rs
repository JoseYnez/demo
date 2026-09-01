use crate::error::AppResult;
use crate::models::text_file::{Codificacion, FinDeLinea, RutaArchivo, TextFile};
use crate::services;

#[tauri::command]
pub async fn read_text_file(ruta: String) -> AppResult<TextFile> {
    let ruta = RutaArchivo::try_from(ruta)?;
    services::text_file::leer(ruta.as_path())
}

#[tauri::command]
pub async fn write_text_file(
    ruta: String,
    contenido: String,
    eol: FinDeLinea,
    codificacion: Codificacion,
) -> AppResult<()> {
    let ruta = RutaArchivo::try_from(ruta)?;
    services::text_file::escribir(ruta.as_path(), &contenido, eol, codificacion)
}
