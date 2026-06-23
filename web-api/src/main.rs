use clap::Parser;
use std::path::PathBuf;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

mod cli;
mod routes;
mod state;
mod ws;

use cli::{Cli, Commands, resolve_data_dir};
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(&cli.log_level)),
        )
        .init();

    // Determine data directory
    let data_dir = resolve_data_dir(&cli);
    std::fs::create_dir_all(&data_dir).ok();

    // Handle CLI commands
    match &cli.command {
        Some(Commands::Serve) | None => run_server(cli, data_dir).await,
        Some(Commands::Settings(args)) => handle_settings(&data_dir, args).await,
        Some(Commands::Relay(args)) => handle_relay(&data_dir, args).await,
        Some(Commands::Health) => handle_health(&data_dir).await,
        Some(Commands::Status) => handle_status(&data_dir).await,
        Some(Commands::Sessions(args)) => handle_sessions(&data_dir, args).await,
    }
}

async fn run_server(cli: Cli, data_dir: PathBuf) -> anyhow::Result<()> {
    tracing::info!("Starting Codex++ Web API v{}", env!("CARGO_PKG_VERSION"));
    tracing::info!("Data directory: {}", data_dir.display());

    let state = Arc::new(AppState::new(&data_dir));

    let app = routes::create_router(state.clone())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let addr = format!("{}:{}", cli.host, cli.port);
    tracing::info!("Listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn handle_settings(data_dir: &PathBuf, args: &cli::SettingsArgs) -> anyhow::Result<()> {
    let state = AppState::new(data_dir);
    let store = state.settings_store.lock().await;
    let settings = store.load().unwrap_or_default();

    match &args.action {
        cli::SettingsAction::Get => {
            println!("{}", serde_json::to_string_pretty(&settings)?);
        }
        cli::SettingsAction::Set { key, value } => {
            let payload = serde_json::json!({ key: value });
            match store.update(payload) {
                Ok(updated) => {
                    println!("✅ Updated. New settings:");
                    println!("{}", serde_json::to_string_pretty(&updated)?);
                }
                Err(e) => eprintln!("❌ Failed to update settings: {}", e),
            }
        }
    }
    Ok(())
}

async fn handle_relay(data_dir: &PathBuf, args: &cli::RelayArgs) -> anyhow::Result<()> {
    let state = AppState::new(data_dir);
    let store = state.settings_store.lock().await;
    let settings = store.load().unwrap_or_default();

    match &args.action {
        cli::RelayAction::List => {
            if settings.relay_profiles.is_empty() {
                println!("No relay profiles configured.");
            } else {
                println!("Relay Profiles (active: {})", settings.active_relay_id);
                println!(
                    "{}",
                    serde_json::to_string_pretty(&settings.relay_profiles)?
                );
            }
        }
        cli::RelayAction::Active => {
            let profile = settings.active_relay_profile();
            println!("Active Relay Profile:");
            println!("  ID: {}", profile.id);
            println!("  Name: {}", profile.name);
            println!("  Model: {}", profile.model);
            println!("  Base URL: {}", profile.base_url);
            println!("  Protocol: {:?}", profile.protocol);
            println!("  Mode: {:?}", profile.relay_mode);
        }
    }
    Ok(())
}

async fn handle_health(data_dir: &PathBuf) -> anyhow::Result<()> {
    let state = AppState::new(data_dir);
    let status_store = state.status_store.lock().await;
    let latest = status_store.load_latest().unwrap_or(None);

    println!("✅ Codex++ Web API is healthy");
    println!("Version: {}", env!("CARGO_PKG_VERSION"));
    println!("Codex Home: {}", state.codex_home.to_string_lossy());
    println!("Data Dir: {}", data_dir.display());
    if let Some(status) = latest {
        println!("Status: {}", status.status);
        println!("Started: {}", status.started_at_ms);
    } else {
        println!("Status: not launched");
    }
    Ok(())
}

async fn handle_status(data_dir: &PathBuf) -> anyhow::Result<()> {
    let state = AppState::new(data_dir);
    let store = state.settings_store.lock().await;
    let settings = store.load().unwrap_or_default();

    println!("=== Codex++ Status ===");
    println!("Version: {}", env!("CARGO_PKG_VERSION"));
    println!("Codex Home: {}", state.codex_home.to_string_lossy());
    println!("Data Dir: {}", data_dir.display());
    println!("Active Relay: {}", settings.active_relay_id);
    println!("Relay Profiles: {}", settings.relay_profiles.len());
    println!("Enhancements Enabled: {}", settings.enhancements_enabled);
    println!("Codex App Path: {}", settings.codex_app_path);
    Ok(())
}

async fn handle_sessions(data_dir: &PathBuf, args: &cli::SessionsArgs) -> anyhow::Result<()> {
    if !args.list {
        println!("Use --list to show sessions");
        return Ok(());
    }

    let state = AppState::new(data_dir);
    let home = &state.codex_home;
    let db_paths = codex_plus_core::codex_sqlite::codex_session_db_paths_from_home(home);

    for db_path in &db_paths {
        let adapter =
            codex_plus_data::SQLiteStorageAdapter::new(db_path, state.backup_store.clone());
        if let Ok(sessions) = adapter.list_local_sessions() {
            if sessions.is_empty() {
                println!("No sessions in {}", db_path.display());
            } else {
                println!("\nSessions in {}:", db_path.display());
                for session in &sessions {
                    let title = if session.title.is_empty() {
                        "(unnamed)"
                    } else {
                        &session.title
                    };
                    println!(
                        "  [{:.8}] {} — {}",
                        session.id, title, session.model_provider
                    );
                }
            }
        }
    }
    Ok(())
}

async fn shutdown_signal() {
    use tokio::signal;
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutting down gracefully...");
}
