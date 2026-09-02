mod clock;
mod commands;
mod error;
mod models;
mod services;

use std::sync::Arc;

use tauri::Manager;

use services::{AuthService, ContactService, NotificationService};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let auth = Arc::new(AuthService::demo().expect("no se pudo preparar la autenticación"));
    let contacts = ContactService::seeded().expect("no se pudo preparar la lista de contactos");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(auth)
        .manage(contacts)
        .setup(|app| {
            let (app_id, display_name) = {
                let config = app.config();
                let app_id = config.identifier.clone();
                let display_name = config
                    .product_name
                    .clone()
                    .unwrap_or_else(|| app_id.clone());
                (app_id, display_name)
            };
            let data_dir = app
                .path()
                .app_local_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir());

            app.manage(Arc::new(
                NotificationService::new(app_id, &data_dir).register(&display_name),
            ));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet::greet,
            commands::auth::login,
            commands::notification::notify,
            commands::contact::list_contacts,
            commands::contact::create_contact,
            commands::contact::update_contact,
            commands::contact::delete_contact
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
