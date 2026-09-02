use std::fmt;

use crate::error::{AppError, AppResult};

const USERNAME_MIN: usize = 3;
const USERNAME_MAX: usize = 64;
const PASSWORD_MAX_BYTES: usize = 256;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Username(String);

impl Username {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for Username {
    type Error = AppError;

    fn try_from(raw: String) -> AppResult<Self> {
        let normalized = raw.trim().to_lowercase();
        let length = normalized.chars().count();
        if !(USERNAME_MIN..=USERNAME_MAX).contains(&length) {
            return Err(AppError::Validation(format!(
                "El usuario debe tener entre {USERNAME_MIN} y {USERNAME_MAX} caracteres."
            )));
        }
        let permitido = |c: char| c.is_alphanumeric() || matches!(c, '.' | '_' | '-' | '@');
        if !normalized.chars().all(permitido) {
            return Err(AppError::Validation(
                "El usuario sólo admite letras, números y . _ - @".into(),
            ));
        }
        Ok(Self(normalized))
    }
}

#[derive(Clone, PartialEq, Eq)]
pub struct Password(String);

impl Password {
    pub fn as_bytes(&self) -> &[u8] {
        self.0.as_bytes()
    }
}

impl TryFrom<String> for Password {
    type Error = AppError;

    fn try_from(raw: String) -> AppResult<Self> {
        if raw.is_empty() {
            return Err(AppError::Validation("La contraseña es obligatoria.".into()));
        }
        if raw.len() > PASSWORD_MAX_BYTES {
            return Err(AppError::Validation(format!(
                "La contraseña no puede superar {PASSWORD_MAX_BYTES} bytes."
            )));
        }
        Ok(Self(raw))
    }
}

impl fmt::Debug for Password {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Password(<oculta>)")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normaliza_el_usuario_recortando_y_bajando_a_minusculas() {
        let username = Username::try_from("  Ada.Lovelace ".to_string()).unwrap();
        assert_eq!(username.as_str(), "ada.lovelace");
    }

    #[test]
    fn rechaza_usuarios_fuera_de_rango() {
        assert!(matches!(
            Username::try_from("ab".to_string()),
            Err(AppError::Validation(_))
        ));
        assert!(matches!(
            Username::try_from("a".repeat(65)),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn rechaza_caracteres_no_permitidos() {
        assert!(matches!(
            Username::try_from("ada lovelace".to_string()),
            Err(AppError::Validation(_))
        ));
        assert!(Username::try_from("ada@example.com".to_string()).is_ok());
    }

    #[test]
    fn la_contrasena_no_puede_estar_vacia_ni_ser_enorme() {
        assert!(matches!(
            Password::try_from(String::new()),
            Err(AppError::Validation(_))
        ));
        assert!(matches!(
            Password::try_from("x".repeat(257)),
            Err(AppError::Validation(_))
        ));
        assert!(Password::try_from("hunter42".to_string()).is_ok());
    }

    #[test]
    fn el_debug_de_la_contrasena_no_la_revela() {
        let password = Password::try_from("secreto".to_string()).unwrap();
        assert_eq!(format!("{password:?}"), "Password(<oculta>)");
    }
}
