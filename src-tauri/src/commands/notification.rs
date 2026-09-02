use std::sync::Arc;

use tauri::State;

use crate::error::{AppError, AppResult};
use crate::models::{NotificationBody, NotificationTitle};
use crate::services::NotificationService;

#[tauri::command]
pub async fn notify(
    avisos: State<'_, Arc<NotificationService>>,
    title: String,
    body: Option<String>,
) -> AppResult<()> {
    let title = NotificationTitle::try_from(title)?;
    let body = NotificationBody::from(body.unwrap_or_default());
    let avisos = Arc::clone(&avisos);

    tauri::async_runtime::spawn_blocking(move || avisos.show(&title, &body))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}
