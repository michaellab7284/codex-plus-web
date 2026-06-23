use axum::{Json, extract::State};
use serde_json::{Value, json};
use std::sync::Arc;

use crate::state::AppState;

/// GET /api/status - Backend status overview
pub async fn backend_status(State(state): State<Arc<AppState>>) -> Json<Value> {
    let status_store = state.status_store.lock().await;
    let latest = status_store.load_latest().unwrap_or(None);

    Json(json!({
        "status": "ok",
        "launchStatus": latest,
        "codexHome": state.codex_home.to_string_lossy()
    }))
}

/// POST /api/launch - Launch Codex
/// Note: Full launch functionality requires Send-safe async from the core crate.
/// Currently returns a placeholder indicating the endpoint is available.
pub async fn launch_codex(State(state): State<Arc<AppState>>) -> Json<Value> {
    let codex_app_path = {
        let store = state.settings_store.lock().await;
        let settings = store.load().unwrap_or_default();
        settings.codex_app_path
    };

    if codex_app_path.is_empty() {
        return Json(json!({
            "status": "error",
            "message": "No Codex app path configured. Please set it in settings first."
        }));
    }

    // The core launcher's launch_and_inject is not Send-safe currently.
    // Launch will be implemented via tokio::task::spawn_blocking in a future update.
    Json(json!({
        "status": "ok",
        "message": "Launch endpoint ready. Full async launch requires core crate Send fix."
    }))
}

/// POST /api/restart - Restart Codex
pub async fn restart_codex(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({
        "status": "ok",
        "message": "Restart endpoint ready. Full async restart requires core crate Send fix."
    }))
}
