use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

pub struct RutaArchivo(PathBuf);

impl TryFrom<String> for RutaArchivo {
    type Error = AppError;

    fn try_from(s: String) -> AppResult<Self> {
        let recortada = s.trim();
        if recortada.is_empty() {
            return Err(AppError::Validation("la ruta no puede estar vacía".into()));
        }
        let ruta = PathBuf::from(recortada);
        if !ruta.is_absolute() {
            return Err(AppError::Validation("la ruta debe ser absoluta".into()));
        }
        Ok(Self(ruta))
    }
}

impl RutaArchivo {
    pub fn as_path(&self) -> &Path {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FinDeLinea {
    Lf,
    Crlf,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Codificacion {
    Utf8,
    Utf8bom,
    Utf16le,
    Utf16be,
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextFile {
    pub contenido: String,
    pub eol: FinDeLinea,
    pub codificacion: Codificacion,
}
