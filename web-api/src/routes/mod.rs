use axum::Router;
use axum::routing::{delete, get, post, put};
use std::sync::Arc;

use super::state::AppState;
use super::ws;

/// Create the main API router with all routes mounted.
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        // API Root (so / doesn't 404)
        .route("/", get(health::api_root))
        // Health & Status
        .route("/api/health", get(health::health_check))
        .route("/api/status", get(status::backend_status))
        // Settings
        .route("/api/settings", get(settings::get_settings))
        .route("/api/settings", put(settings::update_settings))
        // Relay / Provider switching
        .route("/api/relay/profiles", get(relay::list_profiles))
        .route("/api/relay/profiles", post(relay::create_profile))
        .route("/api/relay/profiles/{id}", get(relay::get_profile))
        .route("/api/relay/profiles/{id}", put(relay::update_profile))
        .route("/api/relay/profiles/{id}", delete(relay::delete_profile))
        .route("/api/relay/apply", post(relay::apply_injection))
        .route("/api/relay/clear", post(relay::clear_injection))
        .route("/api/relay/test", post(relay::test_profile))
        .route("/api/relay/switch", post(relay::switch_profile))
        // Sessions
        .route("/api/sessions", get(sessions::list_sessions))
        .route("/api/sessions/{id}", delete(sessions::delete_session))
        // Enhancements
        .route("/api/enhancements", get(enhancements::get_enhancements))
        .route("/api/enhancements", put(enhancements::update_enhancements))
        // Provider presets
        .route("/api/providers/presets", get(presets::list_presets))
        // Logs
        .route("/api/logs", get(health::get_logs))
        // Launch
        .route("/api/launch", post(status::launch_codex))
        .route("/api/restart", post(status::restart_codex))
        // WebSocket
        .route("/ws", get(ws::ws_handler))
        // Fallback for unknown routes
        .fallback(health::not_found)
        .with_state(state)
}

mod enhancements;
mod health;
mod presets;
mod relay;
mod sessions;
mod settings;
mod status;
mod tests;
