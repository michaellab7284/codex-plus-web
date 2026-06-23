use axum::{
    Json,
    extract::{Path, State},
};
use codex_plus_core::models::SessionRef;
use codex_plus_data::SQLiteStorageAdapter;
use serde_json::{Value, json};
use std::sync::Arc;

use crate::state::AppState;

/// GET /api/sessions - List local Codex sessions
pub async fn list_sessions(State(state): State<Arc<AppState>>) -> Json<Value> {
    let home = &state.codex_home;

    // Find all SQLite databases
    let db_paths = codex_plus_core::codex_sqlite::codex_session_db_paths_from_home(home);
    let mut all_sessions = vec![];
    let mut db_paths_found = vec![];

    for db_path in &db_paths {
        let adapter = SQLiteStorageAdapter::new(db_path, state.backup_store.clone());
        if let Ok(sessions) = adapter.list_local_sessions() {
            db_paths_found.push(db_path.to_string_lossy().to_string());
            for session in sessions {
                all_sessions.push(json!({
                    "id": session.id,
                    "title": session.title,
                    "updatedAt": session.updated_at_ms,
                    "dbPath": session.db_path
                }));
            }
        }
    }

    Json(json!({
        "sessions": all_sessions,
        "dbPaths": db_paths_found
    }))
}

/// DELETE /api/sessions/{id} - Delete a session
pub async fn delete_session(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Json<Value> {
    let home = &state.codex_home;
    let db_paths = codex_plus_core::codex_sqlite::codex_session_db_paths_from_home(home);

    let session_ref = match SessionRef::new(id.clone(), "Deleted via Web API") {
        Ok(s) => s,
        Err(e) => {
            return Json(json!({
                "status": "error",
                "message": format!("Invalid session ID: {}", e)
            }));
        }
    };

    let result = codex_plus_data::delete_local_from_paths(
        db_paths,
        state.backup_store.clone(),
        &session_ref,
    );

    Json(json!({
        "status": "ok",
        "message": result.message,
        "deleteStatus": result.status
    }))
}
