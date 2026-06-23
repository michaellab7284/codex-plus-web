#[cfg(test)]
mod tests {
    use axum::{Router, body::Body, http::{Request, StatusCode}};
    use std::sync::Arc;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};
    use tower::ServiceExt;

    use crate::routes;
    use crate::state::AppState;

    static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn test_app() -> Router {
        let id = TEST_COUNTER.fetch_add(1, Ordering::SeqCst);
        let data_dir = PathBuf::from(format!("./test_data_{}", id));
        std::fs::create_dir_all(&data_dir).ok();
        let state = Arc::new(AppState::new(&data_dir));
        routes::create_router(state)
    }

    #[tokio::test]
    async fn test_health_check() {
        let app = test_app();
        let response = app.oneshot(Request::get("/api/health").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body: serde_json::Value = serde_json::from_slice(
            &axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap(),
        ).unwrap();
        assert_eq!(body["status"], "ok");
        assert_eq!(body["service"], "codex-plus-web-api");
    }

    #[tokio::test]
    async fn test_status_endpoint() {
        let app = test_app();
        let response = app.oneshot(Request::get("/api/status").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_settings_get() {
        let app = test_app();
        let response = app.oneshot(Request::get("/api/settings").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_settings_update() {
        let app = test_app();
        let response = app.oneshot(
            Request::put("/api/settings")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::json!({"codexAppPath": "/test/path"}).to_string()))
                .unwrap(),
        ).await.unwrap();
        let body: serde_json::Value = serde_json::from_slice(
            &axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap(),
        ).unwrap();
        assert_eq!(
            body["status"], "ok",
            "Settings update failed: {}",
            body.get("message").and_then(|m| m.as_str()).unwrap_or("unknown")
        );
    }

    #[tokio::test]
    async fn test_relay_profiles_list() {
        let app = test_app();
        let response = app.oneshot(Request::get("/api/relay/profiles").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_relay_switch() {
        let app = test_app();
        let response = app.oneshot(
            Request::post("/api/relay/switch")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::json!({"profileId": "default"}).to_string()))
                .unwrap(),
        ).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_enhancements_get() {
        let app = test_app();
        let response = app.oneshot(Request::get("/api/enhancements").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_providers_presets() {
        let app = test_app();
        let response = app.oneshot(Request::get("/api/providers/presets").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_logs() {
        let app = test_app();
        let response = app.oneshot(Request::get("/api/logs").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_404_endpoint() {
        let app = test_app();
        let response = app.oneshot(Request::get("/api/nonexistent").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }
}
