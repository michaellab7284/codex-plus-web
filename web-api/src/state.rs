use std::path::PathBuf;
use tokio::sync::Mutex;

use codex_plus_core::settings::SettingsStore;
use codex_plus_core::status::StatusStore;
use codex_plus_core::user_scripts::UserScriptManager;
use codex_plus_data::BackupStore;

/// Shared application state accessible from all route handlers.
pub struct AppState {
    /// Settings store for reading/writing ~/.codex config
    pub settings_store: Mutex<SettingsStore>,
    /// Backend status store
    pub status_store: Mutex<StatusStore>,
    /// User script manager (optional - may fail to initialize)
    pub user_scripts: Mutex<Option<UserScriptManager>>,
    /// Codex home directory
    pub codex_home: PathBuf,
    /// Backup store for session operations
    pub backup_store: BackupStore,
    /// Settings file path
    pub settings_path: PathBuf,
    /// Application data directory
    #[allow(dead_code)]
    pub data_dir: PathBuf,
}

impl AppState {
    pub fn new(data_dir: &PathBuf) -> Self {
        // Determine settings path
        let settings_path = codex_plus_core::paths::default_settings_path();

        // Initialize settings store
        let settings_store = SettingsStore::new(settings_path.clone());

        // Initialize status store
        let status_store = StatusStore::new(codex_plus_core::paths::default_latest_status_path());

        // Determine codex home
        let codex_home = codex_plus_core::codex_home::default_codex_home_dir();

        // Initialize user script manager (best effort)
        let user_scripts = init_user_script_manager();

        // Initialize backup store
        let backup_store = BackupStore::new(&codex_home);

        Self {
            settings_store: Mutex::new(settings_store),
            status_store: Mutex::new(status_store),
            user_scripts: Mutex::new(user_scripts),
            codex_home,
            backup_store,
            settings_path,
            data_dir: data_dir.clone(),
        }
    }
}

fn init_user_script_manager() -> Option<UserScriptManager> {
    let config_dir = user_scripts_config_dir();
    std::fs::create_dir_all(config_dir.join("user_scripts")).ok()?;
    let builtin_dir = builtin_user_scripts_dir();
    Some(UserScriptManager::new(
        builtin_dir,
        config_dir.join("user_scripts"),
        config_dir.join("user_scripts.json"),
    ))
}

fn user_scripts_config_dir() -> PathBuf {
    if cfg!(windows) {
        if let Some(roaming) = std::env::var_os("APPDATA") {
            return PathBuf::from(roaming).join("Codex++");
        }
    }
    std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|| directories::BaseDirs::new().map(|dirs| dirs.home_dir().join(".config")))
        .unwrap_or_else(|| PathBuf::from(".config"))
        .join("Codex++")
}

fn builtin_user_scripts_dir() -> PathBuf {
    // In Docker/web context, use a bundled scripts directory
    let data_dir = std::env::var("CODEX_PLUS_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("./data"));
    data_dir.join("user_scripts")
}
