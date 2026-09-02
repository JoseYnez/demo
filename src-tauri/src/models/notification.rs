use crate::error::{AppError, AppResult};

const TITLE_MAX: usize = 120;
const BODY_MAX: usize = 400;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NotificationTitle(String);

impl NotificationTitle {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for NotificationTitle {
    type Error = AppError;

    fn try_from(raw: String) -> AppResult<Self> {
        let recortado = raw.trim();
        if recortado.is_empty() {
            return Err(AppError::Validation("El aviso necesita un título.".into()));
        }
        Ok(Self(acortar(recortado, TITLE_MAX)))
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct NotificationBody(String);

impl NotificationBody {
    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

impl From<String> for NotificationBody {
    fn from(raw: String) -> Self {
        Self(acortar(raw.trim(), BODY_MAX))
    }
}

fn acortar(texto: &str, tope: usize) -> String {
    if texto.chars().count() <= tope {
        return texto.to_string();
    }
    let recortado: String = texto.chars().take(tope - 1).collect();
    format!("{}…", recortado.trim_end())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recorta_el_titulo_y_lo_deja_sin_espacios() {
        let title = NotificationTitle::try_from("  Copia terminada  ".to_string()).unwrap();
        assert_eq!(title.as_str(), "Copia terminada");
    }

    #[test]
    fn rechaza_un_aviso_sin_titulo() {
        assert!(matches!(
            NotificationTitle::try_from("   ".to_string()),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn acorta_en_vez_de_perder_el_aviso() {
        let title = NotificationTitle::try_from("a".repeat(200)).unwrap();
        assert_eq!(title.as_str().chars().count(), TITLE_MAX);
        assert!(title.as_str().ends_with('…'));

        let body = NotificationBody::from("b".repeat(500));
        assert_eq!(body.as_str().chars().count(), BODY_MAX);
    }

    #[test]
    fn no_parte_un_caracter_multibyte() {
        let body = NotificationBody::from("ñ".repeat(500));
        assert_eq!(body.as_str().chars().count(), BODY_MAX);
    }

    #[test]
    fn un_cuerpo_vacio_es_valido_y_se_nota() {
        assert!(NotificationBody::from(String::new()).is_empty());
        assert!(!NotificationBody::from("hay texto".to_string()).is_empty());
    }
}
