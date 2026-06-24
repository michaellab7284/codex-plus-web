use axum::{
    Json,
    extract::{Path, State},
};
use serde_json::{Value, json};
use std::sync::Arc;

use crate::state::AppState;

/// GET /api/relay/profiles - List all relay profiles
pub async fn list_profiles(State(state): State<Arc<AppState>>) -> Json<Value> {
    let store = state.settings_store.lock().await;
    let settings = store.load().unwrap_or_default();

    let profiles: Vec<Value> = settings
        .relay_profiles
        .iter()
        .map(|profile| {
            json!({
                "id": profile.id,
                "name": profile.name,
                "model": profile.model,
                "baseUrl": profile.base_url,
                "protocol": profile.protocol,
                "relayMode": profile.relay_mode,
                "officialMixApiKey": profile.official_mix_api_key,
                "testModel": profile.test_model
            })
        })
        .collect();

    Json(json!({
        "profiles": profiles,
        "activeRelayId": settings.active_relay_id
    }))
}

/// POST /api/relay/profiles - Create a new relay profile
pub async fn create_profile(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    let store = state.settings_store.lock().await;
    let mut settings = store.load().unwrap_or_default();

    // Build a new profile from the payload
    let profile = build_profile_from_payload(&payload);

    // Check for duplicate ID
    if settings.relay_profiles.iter().any(|p| p.id == profile.id) {
        return Json(json!({
            "status": "error",
            "message": format!("Profile with id '{}' already exists", profile.id)
        }));
    }

    settings.relay_profiles.push(profile);

    // Persist back via the store
    let settings_value = serde_json::to_value(&settings).unwrap_or_default();
    match store.update(settings_value) {
        Ok(saved) => Json(json!({
            "status": "ok",
            "profiles": saved.relay_profiles
        })),
        Err(e) => Json(json!({
            "status": "error",
            "message": format!("Failed to save profile: {}", e)
        })),
    }
}

/// GET /api/relay/profiles/{id} - Get a specific relay profile
pub async fn get_profile(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Json<Value> {
    let store = state.settings_store.lock().await;
    let settings = store.load().unwrap_or_default();

    if let Some(profile) = settings.relay_profiles.iter().find(|p| p.id == id) {
        Json(json!({
            "status": "ok",
            "profile": {
                "id": profile.id,
                "name": profile.name,
                "model": profile.model,
                "baseUrl": profile.base_url,
                "upstreamBaseUrl": profile.upstream_base_url,
                "apiKey": "",
                "protocol": profile.protocol,
                "relayMode": profile.relay_mode,
                "officialMixApiKey": profile.official_mix_api_key,
                "testModel": profile.test_model,
                "configContents": profile.config_contents,
                "authContents": profile.auth_contents,
                "useCommonConfig": profile.use_common_config,
                "contextWindow": profile.context_window,
                "autoCompactLimit": profile.auto_compact_limit,
                "modelInsertMode": profile.model_insert_mode,
                "modelList": profile.model_list,
                "userAgent": profile.user_agent
            }
        }))
    } else {
        Json(json!({
            "status": "error",
            "message": format!("Profile '{}' not found", id)
        }))
    }
}

/// PUT /api/relay/profiles/{id} - Update an existing relay profile
pub async fn update_profile(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    let store = state.settings_store.lock().await;
    let mut settings = store.load().unwrap_or_default();

    if let Some(profile) = settings.relay_profiles.iter_mut().find(|p| p.id == id) {
        apply_payload_to_profile(profile, &payload);

        let settings_value = serde_json::to_value(&settings).unwrap_or_default();
        match store.update(settings_value) {
            Ok(_) => Json(json!({"status": "ok"})),
            Err(e) => Json(json!({
                "status": "error",
                "message": format!("Failed to update profile: {}", e)
            })),
        }
    } else {
        Json(json!({
            "status": "error",
            "message": format!("Profile '{}' not found", id)
        }))
    }
}

/// DELETE /api/relay/profiles/{id} - Delete a relay profile
pub async fn delete_profile(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Json<Value> {
    let store = state.settings_store.lock().await;
    let mut settings = store.load().unwrap_or_default();

    let initial_len = settings.relay_profiles.len();
    settings.relay_profiles.retain(|p| p.id != id);

    if settings.relay_profiles.len() < initial_len {
        let settings_value = serde_json::to_value(&settings).unwrap_or_default();
        match store.update(settings_value) {
            Ok(_) => Json(json!({"status": "ok"})),
            Err(e) => Json(json!({
                "status": "error",
                "message": format!("Failed to delete profile: {}", e)
            })),
        }
    } else {
        Json(json!({
            "status": "error",
            "message": format!("Profile '{}' not found", id)
        }))
    }
}

/// POST /api/relay/apply - Apply relay injection
pub async fn apply_injection(State(state): State<Arc<AppState>>) -> Json<Value> {
    let store = state.settings_store.lock().await;
    let settings = store.load().unwrap_or_default();

    let home = &state.codex_home;
    let relay = settings.active_relay_profile();

    let result = if relay.relay_mode == codex_plus_core::settings::RelayMode::PureApi {
        codex_plus_core::relay_config::apply_pure_api_config_to_home(
            home,
            &relay.base_url,
            relay.api_key.as_str(),
        )
    } else if relay.relay_mode == codex_plus_core::settings::RelayMode::Official {
        codex_plus_core::relay_config::clear_relay_config_to_home(home)
    } else {
        let common_config = "";
        codex_plus_core::relay_config::apply_relay_files_to_home_with_common(
            home,
            &relay.config_contents,
            &relay.auth_contents,
            common_config,
        )
    };

    match result {
        Ok(r) => Json(json!({
            "status": "ok",
            "configPath": r.config_path,
            "configured": r.configured
        })),
        Err(e) => Json(json!({
            "status": "error",
            "message": format!("Injection failed: {}", e)
        })),
    }
}

/// POST /api/relay/clear - Clear relay injection
pub async fn clear_injection(State(state): State<Arc<AppState>>) -> Json<Value> {
    let home = &state.codex_home;

    match codex_plus_core::relay_config::clear_relay_config_to_home(home) {
        Ok(r) => Json(json!({
            "status": "ok",
            "configPath": r.config_path
        })),
        Err(e) => Json(json!({
            "status": "error",
            "message": format!("Clear injection failed: {}", e)
        })),
    }
}

/// POST /api/relay/test - Test a relay profile connection
pub async fn test_profile(Json(payload): Json<Value>) -> Json<Value> {
    let base_url = payload
        .get("baseUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let api_key = payload.get("apiKey").and_then(|v| v.as_str()).unwrap_or("");

    if base_url.is_empty() || api_key.is_empty() {
        return Json(json!({
            "status": "error",
            "message": "baseUrl and apiKey are required"
        }));
    }

    // Simple HTTP test to the provider's endpoint
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_default();

    let test_endpoint = format!("{}/models", base_url.trim_end_matches('/'));

    match client
        .get(&test_endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
    {
        Ok(response) => {
            let http_status = response.status().as_u16();
            let text = response.text().await.unwrap_or_default();
            let preview = text.chars().take(500).collect::<String>();

            Json(json!({
                "status": if http_status < 500 { "ok" } else { "error" },
                "httpStatus": http_status,
                "endpoint": test_endpoint,
                "responsePreview": preview
            }))
        }
        Err(e) => Json(json!({
            "status": "error",
            "message": format!("Connection failed: {}", e)
        })),
    }
}

/// POST /api/relay/switch - Switch active relay profile
pub async fn switch_profile(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    let store = state.settings_store.lock().await;
    let mut settings = store.load().unwrap_or_default();

    if let Some(profile_id) = payload.get("profileId").and_then(|v| v.as_str()) {
        if settings.relay_profiles.iter().any(|p| p.id == profile_id) {
            settings.active_relay_id = profile_id.to_string();
            let settings_value = serde_json::to_value(&settings).unwrap_or_default();
            match store.update(settings_value) {
                Ok(_) => Json(json!({"status": "ok", "activeRelayId": profile_id})),
                Err(e) => Json(json!({
                    "status": "error",
                    "message": format!("Failed to switch profile: {}", e)
                })),
            }
        } else {
            Json(json!({
                "status": "error",
                "message": format!("Profile '{}' not found", profile_id)
            }))
        }
    } else {
        Json(json!({
            "status": "error",
            "message": "profileId is required"
        }))
    }
}

// Helper: Build a relay profile from a JSON payload
fn build_profile_from_payload(payload: &Value) -> codex_plus_core::settings::RelayProfile {
    let id = payload
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let mut profile = codex_plus_core::settings::RelayProfile::default();
    profile.id = id;
    apply_payload_to_profile(&mut profile, payload);
    profile
}

// Helper: Apply JSON payload fields to a relay profile
fn apply_payload_to_profile(
    profile: &mut codex_plus_core::settings::RelayProfile,
    payload: &Value,
) {
    if let Some(v) = payload.get("name").and_then(|v| v.as_str()) {
        profile.name = v.to_string();
    }
    if let Some(v) = payload.get("model").and_then(|v| v.as_str()) {
        profile.model = v.to_string();
    }
    if let Some(v) = payload.get("baseUrl").and_then(|v| v.as_str()) {
        profile.base_url = v.to_string();
    }
    if let Some(v) = payload.get("upstreamBaseUrl").and_then(|v| v.as_str()) {
        profile.upstream_base_url = v.to_string();
    }
    if let Some(v) = payload.get("apiKey").and_then(|v| v.as_str()) {
        profile.api_key = v.to_string();
    }
    if let Some(v) = payload.get("protocol").and_then(|v| v.as_str()) {
        profile.protocol = serde_json::from_str(&format!("\"{}\"", v)).unwrap_or_default();
    }
    if let Some(v) = payload.get("relayMode").and_then(|v| v.as_str()) {
        profile.relay_mode = serde_json::from_str(&format!("\"{}\"", v)).unwrap_or_default();
    }
    if let Some(v) = payload.get("officialMixApiKey").and_then(|v| v.as_bool()) {
        profile.official_mix_api_key = v;
    }
    if let Some(v) = payload.get("testModel").and_then(|v| v.as_str()) {
        profile.test_model = v.to_string();
    }
    if let Some(v) = payload.get("configContents").and_then(|v| v.as_str()) {
        profile.config_contents = v.to_string();
    }
    if let Some(v) = payload.get("authContents").and_then(|v| v.as_str()) {
        profile.auth_contents = v.to_string();
    }
    if let Some(v) = payload.get("useCommonConfig").and_then(|v| v.as_bool()) {
        profile.use_common_config = v;
    }
}
