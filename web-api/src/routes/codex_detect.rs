use std::path::PathBuf;
use std::sync::Arc;
use axum::{Json, extract::State};
use serde_json::{json, Value};

use crate::state::AppState;

/// GET /api/codex/detect - Auto-detect Codex installation paths
pub async fn detect_codex(State(state): State<Arc<AppState>>) -> Json<Value> {
    let home = &state.codex_home;

    // Common Codex installation paths on various systems
    let candidates = vec![
        PathBuf::from("/Applications/Codex.app"),           // macOS
        PathBuf::from(std::env::var("HOME").unwrap_or_default()).join("Applications/Codex.app"), // macOS user
        PathBuf::from("/opt/Codex"),                         // Linux
        PathBuf::from("/usr/local/lib/Codex"),               // Linux
        PathBuf::from("/snap/bin/codex"),                    // Snap
    ];

    let mut found = Vec::new();
    for path in &candidates {
        if path.exists() {
            found.push(path.to_string_lossy().to_string());
        }
    }

    // Also check CODEX_HOME env var
    if let Ok(env_path) = std::env::var("CODEX_HOME") {
        let p = PathBuf::from(&env_path);
        if p.exists() && !found.contains(&env_path) {
            found.push(env_path);
        }
    }

    // Check if current settings has a path
    let store = state.settings_store.lock().await;
    let settings = store.load().unwrap_or_default();
    let configured_path = settings.codex_app_path.clone();

    Json(json!({
        "found": found,
        "configured": configured_path,
        "codexHome": home.to_string_lossy(),
        "hint": if found.is_empty() {
            "未检测到 Codex 安装。如果您已安装 Codex，请手动在设置中填写路径。"
        } else {
            "检测到 Codex 安装。如需切换，请在设置中选择。"
        }
    }))
}
