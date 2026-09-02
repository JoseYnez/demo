use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

const NAME_MIN: usize = 2;
const NAME_MAX: usize = 80;
const EMAIL_MAX: usize = 120;
const NOTES_MAX: usize = 280;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ContactRole {
    Admin,
    Editor,
    Viewer,
}

impl TryFrom<String> for ContactRole {
    type Error = AppError;

    fn try_from(raw: String) -> AppResult<Self> {
        match raw.trim() {
            "admin" => Ok(Self::Admin),
            "editor" => Ok(Self::Editor),
            "viewer" => Ok(Self::Viewer),
            _ => Err(AppError::Validation("Elige un rol de la lista.".into())),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContactName(String);

impl ContactName {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for ContactName {
    type Error = AppError;

    fn try_from(raw: String) -> AppResult<Self> {
        let recortado = raw.trim();
        let longitud = recortado.chars().count();
        if !(NAME_MIN..=NAME_MAX).contains(&longitud) {
            return Err(AppError::Validation(format!(
                "El nombre debe tener entre {NAME_MIN} y {NAME_MAX} caracteres."
            )));
        }
        Ok(Self(recortado.to_string()))
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContactEmail(String);

impl ContactEmail {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for ContactEmail {
    type Error = AppError;

    fn try_from(raw: String) -> AppResult<Self> {
        let normalizado = raw.trim().to_lowercase();
        if normalizado.chars().count() > EMAIL_MAX {
            return Err(AppError::Validation(format!(
                "El correo no puede superar {EMAIL_MAX} caracteres."
            )));
        }
        if !tiene_forma_de_correo(&normalizado) {
            return Err(AppError::Validation(
                "Escribe un correo con la forma nombre@dominio.".into(),
            ));
        }
        Ok(Self(normalizado))
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ContactNotes(String);

impl ContactNotes {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for ContactNotes {
    type Error = AppError;

    fn try_from(raw: String) -> AppResult<Self> {
        let recortado = raw.trim();
        if recortado.chars().count() > NOTES_MAX {
            return Err(AppError::Validation(format!(
                "Las notas no pueden superar {NOTES_MAX} caracteres."
            )));
        }
        Ok(Self(recortado.to_string()))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Contact {
    pub id: u32,
    pub name: String,
    pub email: String,
    pub role: ContactRole,
    pub notes: String,
    pub created_at: u64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContactDraft {
    pub name: String,
    pub email: String,
    pub role: String,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContactInput {
    pub name: ContactName,
    pub email: ContactEmail,
    pub role: ContactRole,
    pub notes: ContactNotes,
}

impl TryFrom<ContactDraft> for ContactInput {
    type Error = AppError;

    fn try_from(draft: ContactDraft) -> AppResult<Self> {
        Ok(Self {
            name: ContactName::try_from(draft.name)?,
            email: ContactEmail::try_from(draft.email)?,
            role: ContactRole::try_from(draft.role)?,
            notes: ContactNotes::try_from(draft.notes)?,
        })
    }
}

fn tiene_forma_de_correo(candidato: &str) -> bool {
    let Some((local, dominio)) = candidato.split_once('@') else {
        return false;
    };
    let etiquetas: Vec<&str> = dominio.split('.').collect();
    !local.is_empty()
        && !local.contains(' ')
        && etiquetas.len() >= 2
        && etiquetas.iter().all(|e| !e.is_empty() && !e.contains(' '))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn draft(name: &str, email: &str, role: &str, notes: &str) -> ContactDraft {
        ContactDraft {
            name: name.to_string(),
            email: email.to_string(),
            role: role.to_string(),
            notes: notes.to_string(),
        }
    }

    #[test]
    fn recorta_el_nombre_y_exige_su_rango() {
        let name = ContactName::try_from("  Ada Lovelace  ".to_string()).unwrap();
        assert_eq!(name.as_str(), "Ada Lovelace");
        assert!(matches!(
            ContactName::try_from("A".to_string()),
            Err(AppError::Validation(_))
        ));
        assert!(matches!(
            ContactName::try_from("a".repeat(81)),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn normaliza_el_correo_a_minusculas() {
        let email = ContactEmail::try_from("  Ada@Example.COM ".to_string()).unwrap();
        assert_eq!(email.as_str(), "ada@example.com");
    }

    #[test]
    fn rechaza_correos_sin_forma_de_correo() {
        for candidato in ["ada", "ada@", "@example.com", "ada@example", "a da@ex.com"] {
            assert!(
                matches!(
                    ContactEmail::try_from(candidato.to_string()),
                    Err(AppError::Validation(_))
                ),
                "debería rechazar {candidato}"
            );
        }
    }

    #[test]
    fn solo_admite_los_tres_roles() {
        assert_eq!(
            ContactRole::try_from("editor".to_string()).unwrap(),
            ContactRole::Editor
        );
        assert!(matches!(
            ContactRole::try_from(String::new()),
            Err(AppError::Validation(_))
        ));
        assert!(matches!(
            ContactRole::try_from("root".to_string()),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn las_notas_son_opcionales_pero_tienen_tope() {
        assert_eq!(ContactNotes::try_from(String::new()).unwrap().as_str(), "");
        assert!(matches!(
            ContactNotes::try_from("x".repeat(281)),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn el_borrador_se_valida_entero_antes_de_entrar() {
        let input =
            ContactInput::try_from(draft(" Ada ", "ADA@example.com", "admin", " nota ")).unwrap();
        assert_eq!(input.name.as_str(), "Ada");
        assert_eq!(input.email.as_str(), "ada@example.com");
        assert_eq!(input.role, ContactRole::Admin);
        assert_eq!(input.notes.as_str(), "nota");

        assert!(matches!(
            ContactInput::try_from(draft("Ada", "ada@example.com", "", "")),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn el_rol_viaja_en_minusculas_al_frontend() {
        let json = serde_json::to_string(&ContactRole::Viewer).unwrap();
        assert_eq!(json, "\"viewer\"");
    }
}
