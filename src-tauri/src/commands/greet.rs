use crate::error::{AppError, AppResult};

#[tauri::command]
pub fn greet(name: &str) -> AppResult<String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Validation("Escribe un nombre.".into()));
    }
    Ok(format!("Hola, {name}. Esto viene de Rust."))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn saluda_recortando_el_nombre() {
        assert_eq!(greet("  Ada  ").unwrap(), "Hola, Ada. Esto viene de Rust.");
    }

    #[test]
    fn rechaza_un_nombre_vacio() {
        assert!(matches!(greet("   "), Err(AppError::Validation(_))));
    }
}
