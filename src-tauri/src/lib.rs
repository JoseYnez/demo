mod commands;
mod error;
mod models;
mod services;

use std::sync::Arc;

use services::AuthService;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let auth = Arc::new(AuthService::demo().expect("no se pudo preparar la autenticación"));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(auth)
        .invoke_handler(tauri::generate_handler![
            commands::greet::greet,
            commands::auth::login
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
