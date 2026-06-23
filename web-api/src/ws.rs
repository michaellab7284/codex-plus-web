use axum::extract::State;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::response::IntoResponse;
use std::sync::Arc;

use crate::state::AppState;

/// GET /ws - WebSocket endpoint for real-time events
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ws(socket, state))
}

async fn handle_ws(mut socket: WebSocket, _state: Arc<AppState>) {
    // Send initial connection message
    let msg =
        serde_json::json!({"type": "connected", "message": "WebSocket connected"}).to_string();
    if socket.send(Message::Text(msg.into())).await.is_err() {
        return;
    }

    // Simple ping/pong keepalive
    while let Some(msg) = socket.recv().await {
        match msg {
            Ok(Message::Close(_)) => break,
            Ok(Message::Ping(data)) => {
                let _ = socket.send(Message::Pong(data)).await;
            }
            _ => {}
        }
    }
}
