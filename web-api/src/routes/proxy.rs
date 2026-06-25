use axum::{
    Json,
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, Method, StatusCode},
    response::IntoResponse,
};
use serde_json::{Value, json};
use std::sync::Arc;

use crate::state::AppState;

/// GET /api/proxy/v1/models - List models (passthrough to upstream)
pub async fn proxy_models(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let store = state.settings_store.lock().await;
    let settings = store.load().unwrap_or_default();
    let relay = settings.active_relay_profile();
    let base_url = relay_base_url(&relay);
    let api_key = relay_api_key(&relay);

    if api_key.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "No API key configured"})));
    }

    let client = reqwest::Client::new();
    let upstream_url = format!("{}/v1/models", base_url.trim_end_matches('/'));

    match client
        .get(&upstream_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            (status, Json(serde_json::from_str::<Value>(&body).unwrap_or_else(|_| json!({"raw": body}))))
        }
        Err(e) => (StatusCode::BAD_GATEWAY, Json(json!({"error": format!("Upstream request failed: {}", e)}))),
    }
}

/// POST /api/proxy/v1/responses - Translate Responses API → Chat Completions
pub async fn proxy_responses(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let store = state.settings_store.lock().await;
    let settings = store.load().unwrap_or_default();
    let relay = settings.active_relay_profile();
    let base_url = relay_base_url(&relay);
    let api_key = relay_api_key(&relay);

    if api_key.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "No API key configured"})));
    }

    // Translate Responses API → Chat Completions
    // Always use deepseek-v4-flash - override any model Codex sends
    let model = "deepseek-v4-flash";
    let instructions = body.get("instructions").and_then(|v| v.as_str()).unwrap_or("");

    // Extract text from input (handles both string and array formats)
    let input_text = extract_input_text(body.get("input"));

    let mut messages = vec![];
    if !instructions.is_empty() {
        messages.push(json!({"role": "system", "content": instructions}));
    }
    if !input_text.is_empty() {
        messages.push(json!({"role": "user", "content": input_text}));
    }
    if messages.is_empty() {
        messages.push(json!({"role": "user", "content": "Hello"}));
    }

    let chat_body = json!({
        "model": model,
        "messages": messages,
        "max_tokens": body.get("max_output_tokens").or_else(|| body.get("max_tokens")).and_then(|v| v.as_u64()).unwrap_or(4096),
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .unwrap_or_default();
    let upstream_url = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));

    match client
        .post(&upstream_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&chat_body)
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status();
            match resp.json::<Value>().await {
                Ok(chat_resp) => {
                    // Translate Chat Completions → Responses
                    let response_text = chat_resp
                        .pointer("/choices/0/message/content")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");

                    let responses_resp = json!({
                        "id": chat_resp.get("id").cloned().unwrap_or_default(),
                        "object": "response",
                        "status": "completed",
                        "model": model,
                        "output": [{"type": "text", "text": response_text}]
                    });
                    (status, Json(responses_resp))
                }
                Err(e) => (StatusCode::BAD_GATEWAY, Json(json!({"error": format!("Parse upstream response failed: {}", e)}))),
            }
        }
        Err(e) => (StatusCode::BAD_GATEWAY, Json(json!({"error": format!("Upstream request failed: {}", e)}))),
    }
}

fn relay_base_url(relay: &codex_plus_core::settings::RelayProfile) -> String {
    if !relay.upstream_base_url.trim().is_empty() {
        relay.upstream_base_url.trim().to_string()
    } else if !relay.base_url.trim().is_empty() {
        relay.base_url.trim().to_string()
    } else {
        "https://api.deepseek.com".to_string()
    }
}

fn relay_api_key(profile: &codex_plus_core::settings::RelayProfile) -> String {
    // Try auth_contents first (set during normalize),
    // then fall back to api_key field
    if !profile.auth_contents.trim().is_empty() {
        if let Ok(val) = serde_json::from_str::<Value>(&profile.auth_contents) {
            if let Some(key) = val.get("OPENAI_API_KEY").and_then(|v| v.as_str()) {
                if !key.trim().is_empty() {
                    return key.trim().to_string();
                }
            }
        }
    }
    profile.api_key.trim().to_string()
}

fn extract_input_text(input: Option<&Value>) -> String {
    let Some(input) = input else { return String::new() };
    match input {
        Value::String(s) => s.clone(),
        Value::Array(arr) => {
            let mut texts = Vec::new();
            for item in arr {
                let item_type = item.get("type").and_then(|v| v.as_str()).unwrap_or("");
                match item_type {
                    "input_text" | "text" => {
                        if let Some(t) = item.get("text").and_then(|v| v.as_str()) {
                            texts.push(t.to_string());
                        }
                    }
                    "message" => {
                        if let Some(content) = item.get("content") {
                            match content {
                                Value::Array(content_arr) => {
                                    for c in content_arr {
                                        if let Some(t) = c.get("text").and_then(|v| v.as_str()) {
                                            texts.push(t.to_string());
                                        }
                                    }
                                }
                                Value::String(s) => texts.push(s.clone()),
                                _ => {}
                            }
                        }
                    }
                    _ => {}
                }
            }
            texts.join("\n")
        }
        _ => String::new(),
    }
}
