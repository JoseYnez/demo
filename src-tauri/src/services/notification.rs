use std::fs;
use std::path::{Path, PathBuf};

use crate::error::AppResult;
use crate::models::{NotificationBody, NotificationTitle};

const ICONO: &[u8] = include_bytes!("../../icons/128x128.png");
const NOMBRE_DEL_ICONO: &str = "aviso.png";

pub struct NotificationService {
    app_id: String,
    icon: Option<PathBuf>,
    #[cfg(windows)]
    registrado: bool,
}

impl NotificationService {
    pub fn new(app_id: impl Into<String>, data_dir: &Path) -> Self {
        Self {
            app_id: app_id.into(),
            icon: escribir_el_icono(data_dir),
            #[cfg(windows)]
            registrado: false,
        }
    }
}

fn escribir_el_icono(data_dir: &Path) -> Option<PathBuf> {
    let destino = data_dir.join(NOMBRE_DEL_ICONO);
    if fs::read(&destino).is_ok_and(|actual| actual == ICONO) {
        return Some(destino);
    }
    fs::create_dir_all(data_dir).ok()?;
    fs::write(&destino, ICONO).ok()?;
    Some(destino)
}

#[cfg(windows)]
impl NotificationService {
    pub fn register(mut self, display_name: &str) -> Self {
        self.registrado = registrar(&self.app_id, display_name, self.icon.as_deref());
        self
    }

    pub fn show(&self, title: &NotificationTitle, body: &NotificationBody) -> AppResult<()> {
        use tauri_winrt_notification::{IconCrop, Toast};

        let mut toast = Toast::new(self.aumid_del_toast()).title(title.as_str());
        if !body.is_empty() {
            toast = toast.text1(body.as_str());
        }
        if let Some(icon) = &self.icon {
            toast = toast.icon(icon, IconCrop::Square, "");
        }
        toast
            .show()
            .map_err(|e| crate::error::AppError::Internal(format!("{e:?}")))
    }

    fn aumid_del_toast(&self) -> &str {
        if self.registrado {
            &self.app_id
        } else {
            tauri_winrt_notification::Toast::POWERSHELL_APP_ID
        }
    }
}

#[cfg(windows)]
fn registrar(app_id: &str, display_name: &str, icon: Option<&Path>) -> bool {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let Ok((clave, _)) = RegKey::predef(HKEY_CURRENT_USER)
        .create_subkey(format!(r"Software\Classes\AppUserModelId\{app_id}"))
    else {
        return false;
    };
    let _ = clave.set_value("DisplayName", &display_name);
    if let Some(icon) = icon {
        let _ = clave.set_value("IconUri", &icon.display().to_string());
    }
    true
}

#[cfg(not(windows))]
impl NotificationService {
    pub fn register(self, _display_name: &str) -> Self {
        self
    }

    pub fn show(&self, title: &NotificationTitle, body: &NotificationBody) -> AppResult<()> {
        let mut notification = notify_rust::Notification::new();
        notification.summary(title.as_str()).appname(&self.app_id);
        if !body.is_empty() {
            notification.body(body.as_str());
        }
        if let Some(icon) = &self.icon {
            notification.icon(&icon.display().to_string());
        }
        notification
            .show()
            .map(|_| ())
            .map_err(|e| crate::error::AppError::Internal(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn carpeta_temporal(nombre: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("demo-avisos-{nombre}"));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn deja_el_icono_en_disco_para_que_el_so_pueda_leerlo() {
        let dir = carpeta_temporal("icono");
        let avisos = NotificationService::new("com.ejemplo.demo", &dir);

        let icon = avisos.icon.as_deref().expect("debería haber icono");
        assert!(icon.is_file());
        assert_eq!(fs::read(icon).unwrap(), ICONO);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn repone_el_icono_si_el_que_habia_es_otro() {
        let dir = carpeta_temporal("reposicion");
        let icon = NotificationService::new("com.ejemplo.demo", &dir)
            .icon
            .unwrap();
        fs::write(&icon, b"icono de otra version").unwrap();

        let segunda = NotificationService::new("com.ejemplo.demo", &dir);

        assert_eq!(segunda.icon.as_deref(), Some(icon.as_path()));
        assert_eq!(fs::read(&icon).unwrap(), ICONO);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn no_toca_el_icono_si_ya_es_el_mismo() {
        let dir = carpeta_temporal("intacto");
        let icon = NotificationService::new("com.ejemplo.demo", &dir)
            .icon
            .unwrap();
        let escrito = fs::metadata(&icon).unwrap().modified().unwrap();
        std::thread::sleep(std::time::Duration::from_millis(20));

        NotificationService::new("com.ejemplo.demo", &dir);

        assert_eq!(fs::metadata(&icon).unwrap().modified().unwrap(), escrito);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn guarda_el_identificador_que_le_dan() {
        let dir = carpeta_temporal("identificador");
        let avisos = NotificationService::new("com.ejemplo.demo", &dir);

        assert_eq!(avisos.app_id, "com.ejemplo.demo");

        let _ = fs::remove_dir_all(&dir);
    }

    #[cfg(windows)]
    #[test]
    fn sin_registrar_el_aviso_sale_con_el_aumid_de_powershell() {
        let dir = carpeta_temporal("sin-registrar");
        let avisos = NotificationService::new("com.ejemplo.demo", &dir);

        assert_eq!(
            avisos.aumid_del_toast(),
            tauri_winrt_notification::Toast::POWERSHELL_APP_ID
        );

        let _ = fs::remove_dir_all(&dir);
    }

    #[cfg(windows)]
    #[test]
    #[ignore = "escribe en el registro y saca un aviso de verdad en la pantalla; se lanza a mano"]
    fn el_aumid_propio_saca_el_aviso_sin_caer_al_de_powershell() {
        let dir = std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(std::env::temp_dir)
            .join("com.luisyanez.demo");
        let avisos = NotificationService::new("com.luisyanez.demo", &dir).register("demo");
        assert_eq!(avisos.aumid_del_toast(), "com.luisyanez.demo");

        let title = NotificationTitle::try_from("Hay una versión nueva".to_string()).unwrap();
        let body =
            NotificationBody::from("Se instalará la próxima vez que cierres la app.".to_string());
        avisos
            .show(&title, &body)
            .expect("el AUMID registrado debería bastar para sacar el aviso");
    }
}
