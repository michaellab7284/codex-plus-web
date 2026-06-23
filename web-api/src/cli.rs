use clap::{Args, Parser, Subcommand};
use std::path::PathBuf;

/// Codex++ Web API — LLM Provider Management Tool
#[derive(Parser, Debug)]
#[command(name = "web-api", version, about = "Codex++ Web API Server & CLI")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Commands>,

    /// API host address
    #[arg(long, env = "API_HOST", default_value = "0.0.0.0")]
    pub host: String,

    /// API port
    #[arg(long, env = "API_PORT", default_value_t = 3001)]
    pub port: u16,

    /// Data directory
    #[arg(long, env = "CODEX_PLUS_DATA_DIR")]
    pub data_dir: Option<String>,

    /// Log level
    #[arg(long, env = "RUST_LOG", default_value = "info")]
    pub log_level: String,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Start the HTTP API server (default)
    Serve,
    /// View and manage settings
    Settings(SettingsArgs),
    /// List and manage relay profiles
    Relay(RelayArgs),
    /// Health check
    Health,
    /// Show status
    Status,
    /// List sessions
    Sessions(SessionsArgs),
}

#[derive(Args, Debug)]
pub struct SettingsArgs {
    #[command(subcommand)]
    pub action: SettingsAction,
}

#[derive(Subcommand, Debug)]
pub enum SettingsAction {
    /// Show all settings
    Get,
    /// Set a setting value (JSON key=value)
    Set { key: String, value: String },
}

#[derive(Args, Debug)]
pub struct RelayArgs {
    #[command(subcommand)]
    pub action: RelayAction,
}

#[derive(Subcommand, Debug)]
pub enum RelayAction {
    /// List all relay profiles
    List,
    /// Show active relay profile
    Active,
}

#[derive(Args, Debug)]
pub struct SessionsArgs {
    /// List sessions
    #[arg(long, default_value_t = false)]
    pub list: bool,
}

/// Get the data directory path from CLI args or default
pub fn resolve_data_dir(cli: &Cli) -> PathBuf {
    if let Some(dir) = &cli.data_dir {
        PathBuf::from(dir)
    } else if let Some(dirs) = directories::ProjectDirs::from("com", "bigpizzav3", "codex-plus-web")
    {
        dirs.data_dir().to_path_buf()
    } else {
        PathBuf::from("./data")
    }
}
