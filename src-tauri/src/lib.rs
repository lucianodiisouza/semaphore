use std::sync::Arc;
use std::time::Duration;

use sem_core::config::{window_dimensions, Config};
use sem_core::ipc::{IpcServer, PruneTask};
use sem_core::state::{LightState, StateMachine};
use semctl::detect::{self, ToolStatus};
use semctl::install;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, LogicalSize, Manager, WebviewWindow,
};
use tokio::sync::RwLock;

#[derive(Clone, serde::Serialize)]
struct StatePayload {
    state: String,
}

#[tauri::command]
fn get_config() -> Config {
    Config::load()
}

#[tauri::command]
fn save_config(config: Config) -> Result<(), String> {
    config.save().map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_stealth(app: AppHandle, enabled: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_content_protected(enabled)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn install_hooks(tool: String) -> Result<(), String> {
    let all = tool == "all";
    let tool_opt = if all { None } else { Some(tool.as_str()) };
    install::run_install(all, tool_opt).map_err(|e| e.to_string())
}

#[tauri::command]
fn detect_tools() -> Vec<ToolStatus> {
    detect::detect_tools()
}

#[tauri::command]
fn complete_onboarding(app: AppHandle) -> Result<(), String> {
    let mut config = Config::load();
    config.onboarding_completed = true;
    config.save().map_err(|e| e.to_string())?;
    if let Some(window) = app.get_webview_window("onboarding") {
        window.hide().map_err(|e| e.to_string())?;
    }
    focus_main_window(&app);
    Ok(())
}

#[tauri::command]
fn show_settings(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window.show().map_err(|e| e.to_string())?;
        window.center().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn show_onboarding(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("onboarding") {
        window.show().map_err(|e| e.to_string())?;
        window.center().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn apply_window_size(app: AppHandle, size: String) -> Result<(), String> {
    apply_main_window_size(&app, &size)
}

fn apply_main_window_size(app: &AppHandle, size: &str) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let (width, height) = window_dimensions(size);
        window
            .set_size(LogicalSize::new(width, height))
            .map_err(|e| e.to_string())?;
        let _ = window.set_shadow(false);
    }
    Ok(())
}

const MAX_SOUND_BYTES: u64 = 512 * 1024;

const ALLOWED_SOUND_EXTENSIONS: &[&str] = &["mp3", "wav", "ogg", "m4a", "aac", "webm"];

#[tauri::command]
fn import_stage_sound(stage: String, source_path: String) -> Result<String, String> {
    let stage = stage.as_str();
    if !matches!(stage, "green" | "yellow" | "red") {
        return Err("invalid stage".to_string());
    }

    let source = std::path::Path::new(&source_path);
    if !source.is_file() {
        return Err("file not found".to_string());
    }

    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .ok_or_else(|| "missing file extension".to_string())?;

    if !ALLOWED_SOUND_EXTENSIONS.contains(&ext.as_str()) {
        return Err("unsupported audio format".to_string());
    }

    let metadata = std::fs::metadata(source).map_err(|e| e.to_string())?;
    if metadata.len() > MAX_SOUND_BYTES {
        return Err(format!(
            "file too large (max {} KB)",
            MAX_SOUND_BYTES / 1024
        ));
    }

    let dest_dir = Config::sounds_dir();
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let dest = dest_dir.join(format!("{stage}.{ext}"));
    std::fs::copy(source, &dest).map_err(|e| e.to_string())?;

    dest.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "invalid destination path".to_string())
}

fn emit_state(app: &AppHandle, state: LightState) {
    let payload = StatePayload {
        state: match state {
            LightState::Green => "green".to_string(),
            LightState::Yellow => "yellow".to_string(),
            LightState::Red => "red".to_string(),
        },
    };
    let _ = app.emit("state-changed", payload);
}

fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn setup_main_window(window: &WebviewWindow, config: &Config) -> tauri::Result<()> {
    if config.stealth {
        let _ = window.set_content_protected(true);
    }
    let _ = window.set_always_on_top(config.always_on_top);
    let _ = window.set_shadow(false);
    let (width, height) = window_dimensions(&config.window.size);
    let _ = window.set_size(LogicalSize::new(width, height));
    let _ = window.set_position(tauri::Position::Physical(
        tauri::PhysicalPosition::new(config.window.x, config.window.y),
    ));
    Ok(())
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let config = Config::load();
    let show = MenuItem::with_id(app, "show", "Show Semaphore", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide Window", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let stealth = MenuItem::with_id(app, "stealth", "Toggle Stealth", true, None::<&str>)?;
    let always_on_top = CheckMenuItem::with_id(
        app,
        "always_on_top",
        "Always on Top",
        true,
        config.always_on_top,
        None::<&str>,
    )?;
    let always_on_top_toggle = always_on_top.clone();
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[&show, &hide, &settings, &stealth, &always_on_top, &quit],
    )?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => focus_main_window(app),
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "settings" => {
                let _ = show_settings(app.clone());
            }
            "stealth" => {
                if let Some(window) = app.get_webview_window("main") {
                    let mut config = Config::load();
                    config.stealth = !config.stealth;
                    let _ = window.set_content_protected(config.stealth);
                    let _ = config.save();
                }
            }
            "always_on_top" => {
                if let Some(window) = app.get_webview_window("main") {
                    let mut config = Config::load();
                    config.always_on_top = !config.always_on_top;
                    let _ = window.set_always_on_top(config.always_on_top);
                    let _ = always_on_top_toggle.set_checked(config.always_on_top);
                    let _ = config.save();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                focus_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn start_ipc(app: &AppHandle, machine: Arc<RwLock<StateMachine>>) {
    let machine_ipc = Arc::clone(&machine);
    let machine_prune = Arc::clone(&machine);
    let app_handle = app.clone();

    let (server, handle) = IpcServer::new(machine_ipc);
    let prune = PruneTask::new(machine_prune, handle.state_tx.clone());
    let mut rx = handle.state_tx.subscribe();

    tauri::async_runtime::spawn(async move {
        if let Err(err) = server.run().await {
            tracing::error!(?err, "ipc server failed");
        }
    });

    tauri::async_runtime::spawn(prune.run());

    tauri::async_runtime::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(state) => emit_state(&app_handle, state),
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                Err(_) => break,
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .try_init()
        .ok();

    let config = Config::load();
    let machine = Arc::new(RwLock::new(StateMachine::new(Duration::from_secs(
        config.idle_timeout_secs,
    ))));
    let machine_setup = Arc::clone(&machine);
    let show_onboarding_on_start = !config.onboarding_completed;

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            focus_main_window(app);
        }))
        .setup(move |app| {
            #[cfg(target_os = "macos")]
            {
                let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            let _ = install::prepare_runtime();
            setup_tray(app.handle())?;
            start_ipc(app.handle(), machine_setup);

            if let Some(window) = app.get_webview_window("main") {
                setup_main_window(&window, &config)?;
            }

            if show_onboarding_on_start {
                let _ = show_onboarding(app.handle().clone());
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            set_stealth,
            install_hooks,
            detect_tools,
            complete_onboarding,
            show_settings,
            show_onboarding,
            apply_window_size,
            import_stage_sound
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
