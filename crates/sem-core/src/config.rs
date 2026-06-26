use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StageSound {
    #[serde(default = "default_sound_preset")]
    pub preset: String,
    #[serde(default)]
    pub custom_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SoundsConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_green_sound")]
    pub green: StageSound,
    #[serde(default = "default_yellow_sound")]
    pub yellow: StageSound,
    #[serde(default = "default_red_sound")]
    pub red: StageSound,
}

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
    #[serde(default)]
    pub sounds: SoundsConfig,
    #[serde(default)]
    pub onboarding_completed: bool,
    #[serde(default)]
    pub autostart: bool,
    #[serde(default)]
    pub launch_with_tools: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowConfig {
    #[serde(default = "default_pos")]
    pub x: i32,
    #[serde(default = "default_pos")]
    pub y: i32,
    #[serde(default = "default_window_size")]
    pub size: String,
    #[serde(default)]
    pub horizontal: bool,
}

impl Default for WindowConfig {
    fn default() -> Self {
        Self {
            x: 20,
            y: 20,
            size: default_window_size(),
            horizontal: false,
        }
    }
}

fn default_window_size() -> String {
    "medium".to_string()
}

const WINDOW_INSET_TOP: u32 = 0;
const WINDOW_INSET_LEFT: u32 = 0;
const WINDOW_INSET_BOTTOM: u32 = 0;
const WINDOW_INSET_RIGHT: u32 = 0;

/// 1px border on each side of `.housing` (border-box width/height are outer size).
const HOUSING_BORDER: u32 = 2;

fn housing_dimensions(size: &str) -> (u32, u32) {
    // (outer width in vertical layout, outer height in vertical layout)
    match size {
        "small" => (44, 122 + HOUSING_BORDER),
        "large" => (86, 236 + HOUSING_BORDER),
        _ => (58, 160 + HOUSING_BORDER),
    }
}

/// Physical pixel dimensions for the main widget window.
pub fn window_dimensions(size: &str, horizontal: bool) -> (u32, u32) {
    let (width, height) = housing_dimensions(size);
    let (width, height) = if horizontal {
        (height, width)
    } else {
        (width, height)
    };
    (
        width + WINDOW_INSET_LEFT + WINDOW_INSET_RIGHT,
        height + WINDOW_INSET_TOP + WINDOW_INSET_BOTTOM,
    )
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

fn default_sound_preset() -> String {
    "soft-chime".to_string()
}

fn default_green_sound() -> StageSound {
    StageSound {
        preset: "soft-chime".to_string(),
        custom_path: None,
    }
}

fn default_yellow_sound() -> StageSound {
    StageSound {
        preset: "double-ping".to_string(),
        custom_path: None,
    }
}

fn default_red_sound() -> StageSound {
    StageSound {
        preset: "alert".to_string(),
        custom_path: None,
    }
}

impl Default for SoundsConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            green: default_green_sound(),
            yellow: default_yellow_sound(),
            red: default_red_sound(),
        }
    }
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
            sounds: SoundsConfig::default(),
            onboarding_completed: false,
            autostart: false,
            launch_with_tools: false,
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

    pub fn sounds_dir() -> PathBuf {
        Self::config_dir().join("sounds")
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_window_size_is_medium() {
        let config = Config::default();
        assert_eq!(config.window.size, "medium");
    }

    #[test]
    fn default_onboarding_not_completed() {
        let config = Config::default();
        assert!(!config.onboarding_completed);
    }

    #[test]
    fn window_dimensions_for_each_size() {
        assert_eq!(window_dimensions("small", false), (44, 124));
        assert_eq!(window_dimensions("medium", false), (58, 162));
        assert_eq!(window_dimensions("large", false), (86, 238));
        assert_eq!(window_dimensions("unknown", false), (58, 162));
    }

    #[test]
    fn window_dimensions_horizontal_swaps_axes() {
        assert_eq!(window_dimensions("medium", true), (162, 58));
        assert_eq!(window_dimensions("small", true), (124, 44));
    }

    #[test]
    fn deserializes_new_fields_with_defaults() {
        let raw = r#"{"theme":"classic"}"#;
        let config: Config = serde_json::from_str(raw).unwrap();
        assert_eq!(config.window.size, "medium");
        assert!(!config.onboarding_completed);
        assert!(!config.autostart);
        assert!(!config.launch_with_tools);
    }
}
