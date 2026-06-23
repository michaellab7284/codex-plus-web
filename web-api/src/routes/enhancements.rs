use axum::{Json, extract::State};
use serde_json::{Value, json};
use std::sync::Arc;

use crate::state::AppState;

/// GET /api/enhancements - Get current enhancement settings
pub async fn get_enhancements(State(state): State<Arc<AppState>>) -> Json<Value> {
    let store = state.settings_store.lock().await;
    let settings = store.load().unwrap_or_default();

    Json(json!({
        "enhancementsEnabled": settings.enhancements_enabled,
        "codexAppPluginEntryUnlock": settings.codex_app_plugin_entry_unlock,
        "codexAppPluginMarketplaceUnlock": settings.codex_app_plugin_marketplace_unlock,
        "codexAppForcePluginInstall": settings.codex_app_force_plugin_install,
        "codexAppModelWhitelistUnlock": settings.codex_app_model_whitelist_unlock,
        "codexAppSessionDelete": settings.codex_app_session_delete,
        "codexAppMarkdownExport": settings.codex_app_markdown_export,
        "codexAppPasteFix": settings.codex_app_paste_fix,
        "codexAppProjectMove": settings.codex_app_project_move,
        "codexAppConversationTimeline": settings.codex_app_conversation_timeline,
        "codexAppThreadIdBadge": settings.codex_app_thread_id_badge,
        "codexAppConversationView": settings.codex_app_conversation_view,
        "codexAppThreadScrollRestore": settings.codex_app_thread_scroll_restore,
        "codexAppZedRemoteOpen": settings.codex_app_zed_remote_open,
        "codexAppUpstreamWorktreeCreate": settings.codex_app_upstream_worktree_create,
        "codexAppImageOverlayEnabled": settings.codex_app_image_overlay_enabled,
        "codexAppServiceTierControls": settings.codex_app_service_tier_controls,
        "codexGoalsEnabled": settings.codex_goals_enabled,
        "providerSyncEnabled": settings.provider_sync_enabled,
        "computerUseGuardEnabled": settings.computer_use_guard_enabled,
        "cliWrapperEnabled": settings.cli_wrapper_enabled
    }))
}

/// PUT /api/enhancements - Update enhancement settings
pub async fn update_enhancements(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    let mut store = state.settings_store.lock().await;

    match store.update(payload) {
        Ok(updated) => Json(json!({
            "status": "ok",
            "enhancements": {
                "enhancementsEnabled": updated.enhancements_enabled,
                "codexAppPluginEntryUnlock": updated.codex_app_plugin_entry_unlock,
                "codexAppSessionDelete": updated.codex_app_session_delete,
                "codexAppMarkdownExport": updated.codex_app_markdown_export,
                "codexAppPasteFix": updated.codex_app_paste_fix,
                "codexAppProjectMove": updated.codex_app_project_move,
                "codexAppConversationTimeline": updated.codex_app_conversation_timeline
            }
        })),
        Err(e) => Json(json!({
            "status": "error",
            "message": format!("Failed to update enhancements: {}", e)
        })),
    }
}
