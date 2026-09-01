pub mod commands;
pub mod error;
pub mod models;
pub mod services;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::text_file::read_text_file,
            commands::text_file::write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
