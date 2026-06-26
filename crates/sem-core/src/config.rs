use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default = "default_idle_timeout")]
    pub idle_timeout_secs: u64,
    #[serde(default)]
    pub stealth: bool,
    #[serde(default = "default_always_on_top")]
    pub always_on_top: bool,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_locale")]
    pub locale: String,
    #[serde(default)]
    pub stealth_acknowledged: bool,
    #[serde(default)]
    pub window: WindowConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowConfig {
    #[serde(default = "default_pos")]
    pub x: i32,
    #[serde(default = "default_pos")]
    pub y: i32,
}

impl Default for WindowConfig {
    fn default() -> Self {
        Self { x: 20, y: 20 }
    }
}

fn default_idle_timeout() -> u64 {
    300
}

fn default_always_on_top() -> bool {
    true
}

fn default_theme() -> String {
    "classic".to_string()
}

fn default_locale() -> String {
    "en".to_string()
}

fn default_pos() -> i32 {
    20
}

impl Default for Config {
    fn default() -> Self {
        Self {
            idle_timeout_secs: default_idle_timeout(),
            stealth: false,
            always_on_top: default_always_on_top(),
            stealth_acknowledged: false,
            theme: default_theme(),
            locale: detect_locale(),
            window: WindowConfig::default(),
        }
    }
}

fn detect_locale() -> String {
  if let Ok(locale) = std::env::var("LC_ALL").or_else(|_| std::env::var("LANG")) {
    let lower = locale.to_lowercase();
    if lower.starts_with("pt") {
      return "pt-BR".to_string();
    }
  }
  "en".to_string()
}

impl Config {
    pub fn config_dir() -> PathBuf {
        dirs_home().join(".semaphore")
    }

    pub fn config_path() -> PathBuf {
        Self::config_dir().join("config.json")
    }

    pub fn bin_dir() -> PathBuf {
        Self::config_dir().join("bin")
    }

    pub fn load() -> Self {
        let path = Self::config_path();
        if !path.exists() {
            let config = Self::default();
            let _ = config.save();
            return config;
        }
        std::fs::read_to_string(path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default()
    }

    pub fn save(&self) -> std::io::Result<()> {
        let dir = Self::config_dir();
        std::fs::create_dir_all(&dir)?;
        let raw = serde_json::to_string_pretty(self)?;
        std::fs::write(Self::config_path(), raw)
    }
}

fn dirs_home() -> PathBuf {
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home);
    }
    if let Ok(profile) = std::env::var("USERPROFILE") {
        return PathBuf::from(profile);
    }
    PathBuf::from(".")
}
