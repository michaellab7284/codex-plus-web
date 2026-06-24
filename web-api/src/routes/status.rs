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

/// POST /api/launch - Launch Codex
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

    // On Linux, try to run the codex binary directly
    let candidate = PathBuf::from(codex_app_path.trim());
    let executable = if candidate.is_file() {
        // Path is directly to the binary (e.g. /usr/bin/codex)
        candidate.clone()
    } else {
        // Try common names
        let with_name = candidate.join("codex");
        if with_name.exists() {
            with_name
        } else {
            candidate.join("Codex")
        }
    };

    if !executable.exists() {
        return Json(json!({
            "status": "error",
            "message": format!("未找到 Codex 可执行文件: {}", executable.display())
        }));
    }

    match tokio::process::Command::new(&executable)
        .arg("--version")
        .output()
        .await
    {
        Ok(output) => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Json(json!({
                "status": "ok",
                "message": format!("Codex 已就绪: {}", executable.display()),
                "version": version,
                "appDir": executable.parent().map(|p| p.to_string_lossy().to_string())
            }))
        }
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
