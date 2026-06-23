use axum::{Json, http::StatusCode, response::IntoResponse};
use serde_json::{Value, json};

/// GET / - API root, returns service info
pub async fn api_root() -> Json<Value> {
    Json(json!({
        "service": "codex-plus-web-api",
        "version": env!("CARGO_PKG_VERSION"),
        "endpoints": [
            "GET  /api/health",
            "GET  /api/status",
            "GET  /api/settings",
            "PUT  /api/settings",
            "GET  /api/relay/profiles",
            "POST /api/relay/profiles",
            "GET  /api/enhancements",
            "GET  /api/providers/presets",
            "GET  /api/sessions",
            "DELETE /api/sessions/{id}",
            "GET  /api/logs",
            "WS   /ws",
        ]
    }))
}

/// GET /api/health - Basic health check
pub async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
        "service": "codex-plus-web-api"
    }))
}

/// GET /api/logs - Read latest diagnostic logs
pub async fn get_logs() -> Json<Value> {
    let logs_path = codex_plus_core::diagnostic_log::diagnostic_log_path();
    let lines = 100;

    let text = std::fs::read_to_string(&logs_path)
        .ok()
        .map(|content| {
            content
                .lines()
                .rev()
                .take(lines)
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect::<Vec<_>>()
                .join("\n")
        })
        .unwrap_or_default();

    Json(json!({
        "path": logs_path.to_string_lossy().to_string(),
        "text": text,
        "lines": lines
    }))
}

/// 404 fallback
pub async fn not_found() -> impl IntoResponse {
    (
        StatusCode::NOT_FOUND,
        Json(json!({
            "status": "error",
            "message": "Route not found"
        })),
    )
}
