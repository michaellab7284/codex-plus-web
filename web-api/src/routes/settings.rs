use axum::{Json, extract::State};
use serde_json::{Value, json};
use std::sync::Arc;

use crate::state::AppState;

/// GET /api/settings - Load all settings
pub async fn get_settings(State(state): State<Arc<AppState>>) -> Json<Value> {
    let store = state.settings_store.lock().await;
    let settings = store.load().unwrap_or_default();

    // Also try loading user scripts inventory
    let user_scripts_guard = state.user_scripts.lock().await;
    let inventory = user_scripts_guard
        .as_ref()
        .and_then(|us| us.inventory().ok());

    Json(json!({
        "settings": settings,
        "settings_path": state.settings_path.to_string_lossy(),
        "user_scripts": inventory
    }))
}

/// PUT /api/settings - Update settings
pub async fn update_settings(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    let store = state.settings_store.lock().await;

    match store.update(payload) {
        Ok(updated_settings) => Json(json!({
            "status": "ok",
            "settings": updated_settings
        })),
        Err(e) => Json(json!({
            "status": "error",
            "message": format!("Failed to update settings: {}", e)
        })),
    }
}
