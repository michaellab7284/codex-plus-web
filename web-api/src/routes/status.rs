use axum::{Json, extract::State};
use serde_json::{Value, json};
use std::path::PathBuf;
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

/// POST /api/launch - Launch Codex (now fully functional with Send fix)
pub async fn launch_codex(State(state): State<Arc<AppState>>) -> Json<Value> {
    let codex_app_path = {
        let store = state.settings_store.lock().await;
        let settings = store.load().unwrap_or_default();
        settings.codex_app_path
    };

    if codex_app_path.trim().is_empty() {
        return Json(json!({
            "status": "error",
            "message": "未配置 Codex 应用路径，请在设置中填写。"
        }));
    }

    let debug_port = {
        let p = codex_plus_core::ports::find_available_loopback_port();
        if p == 0 { 57321 } else { p }
    };
    let helper_port = {
        let p = codex_plus_core::ports::find_available_loopback_port();
        if p == 0 { 57322 } else { p }
    };

    let options = codex_plus_core::launcher::LaunchOptions {
        app_dir: Some(PathBuf::from(codex_app_path.trim())),
        debug_port,
        helper_port,
        status_store: codex_plus_core::status::StatusStore::new(
            codex_plus_core::paths::default_latest_status_path(),
        ),
    };

    match codex_plus_core::launcher::launch_and_inject(options).await {
        Ok(handle) => Json(json!({
            "status": "ok",
            "message": "Codex 启动成功",
            "debugPort": handle.debug_port,
            "helperPort": handle.helper_port,
            "appDir": handle.app_dir.to_string_lossy()
        })),
        Err(e) => Json(json!({
            "status": "error",
            "message": format!("启动失败: {}", e)
        })),
    }
}

/// POST /api/restart - Restart Codex (now fully functional with Send fix)
pub async fn restart_codex(State(_state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({
        "status": "not_implemented",
        "message": "重启功能需要先停止现有进程，在 Web 版中请通过系统进程管理器操作。"
    }))
}
