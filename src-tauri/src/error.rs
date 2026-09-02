use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum AppError {
    #[error("{0}")]
    Validation(String),

    #[error("Usuario o contraseña incorrectos.")]
    InvalidCredentials,

    #[error("Demasiados intentos fallidos. Espera {0} s antes de volver a probar.")]
    Locked(u64),

    #[error("{0} ya no existe.")]
    NotFound(String),

    #[error("Error interno: {0}")]
    Internal(String),
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
