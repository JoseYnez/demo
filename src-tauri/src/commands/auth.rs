use std::sync::Arc;

use tauri::State;

use crate::error::{AppError, AppResult};
use crate::models::{Password, Session, Username};
use crate::services::AuthService;

#[tauri::command]
pub async fn login(
    auth: State<'_, Arc<AuthService>>,
    username: String,
    password: String,
) -> AppResult<Session> {
    let username = Username::try_from(username)?;
    let password = Password::try_from(password)?;
    let auth = Arc::clone(&auth);

    tauri::async_runtime::spawn_blocking(move || auth.login(&username, &password))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}
