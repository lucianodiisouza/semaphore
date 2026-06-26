use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, RwLock as StdRwLock};
use std::time::Duration;

use sem_core::config::{window_dimensions, Config};
use sem_core::ipc::{IpcServer, PruneTask};
use sem_core::state::{LightState, StateMachine, StateSnapshot};
use sem_core::theme::light_rgb;
use semctl::detect::{self, ToolStatus};
use semctl::install;
use tauri::{
    image::Image,
    menu::{CheckMenuItem, Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, LogicalSize, Manager, WebviewWindow,
};
use tokio::sync::RwLock;

#[derive(Clone, serde::Serialize)]
struct StatePayload {
    state: String,
    awaiting_input: bool,
}

struct LightTestRunning(AtomicBool);
struct GeniusGameRunning(AtomicBool);
struct IpcStateMachine(Arc<RwLock<StateMachine>>);

const LIGHT_TEST_STEP_MS: u64 = 480;
/// Matches `.housing.awaiting-input .light { animation: awaiting-pulse 1.2s ... }`
const AWAITING_INPUT_BLINK_CYCLE_MS: u64 = 1200;
const LIGHT_TEST_AWAITING_INPUT_BLINKS: u64 = 3;

fn light_state_name(state: LightState) -> &'static str {
    match state {
        LightState::Green => "green",
        LightState::Yellow => "yellow",
        LightState::Red => "red",
    }
}

fn state_payload(snapshot: StateSnapshot) -> StatePayload {
    StatePayload {
        state: light_state_name(snapshot.state).to_string(),
        awaiting_input: snapshot.awaiting_input,
    }
}

fn preview_light(app: &AppHandle, state: LightState) {
    let theme = Config::load().theme;
    if let Some(tray) = app.tray_by_id(TRAY_ICON_ID) {
        let _ = tray.set_icon(Some(circle_tray_icon(state, &theme)));
    }
    let _ = app.emit("light-preview", state_payload(StateSnapshot {
        state,
        awaiting_input: false,
    }));
}

fn preview_awaiting_input(app: &AppHandle) {
    let theme = Config::load().theme;
    if let Some(tray) = app.tray_by_id(TRAY_ICON_ID) {
        let _ = tray.set_icon(Some(circle_tray_icon(LightState::Green, &theme)));
    }
    let _ = app.emit("light-preview", state_payload(StateSnapshot {
        state: LightState::Green,
        awaiting_input: true,
    }));
}

async fn run_light_test(app: AppHandle) {
    if app
        .try_state::<LightTestRunning>()
        .is_none_or(|running| running.0.swap(true, Ordering::SeqCst))
    {
        return;
    }

    if genius_game_active(&app) {
        if let Some(running) = app.try_state::<LightTestRunning>() {
            running.0.store(false, Ordering::SeqCst);
        }
        return;
    }

    focus_main_window(&app);
    let _ = app.emit("test-lights-start", ());

    for state in [LightState::Green, LightState::Yellow, LightState::Red] {
        preview_light(&app, state);
        tokio::time::sleep(Duration::from_millis(LIGHT_TEST_STEP_MS)).await;
    }

    preview_awaiting_input(&app);
    tokio::time::sleep(Duration::from_millis(
        AWAITING_INPUT_BLINK_CYCLE_MS * LIGHT_TEST_AWAITING_INPUT_BLINKS,
    ))
    .await;

    let snapshot = if let Some(sm) = app.try_state::<IpcStateMachine>() {
        let guard = sm.0.read().await;
        guard.snapshot()
    } else {
        StateSnapshot::default()
    };
    emit_state(&app, snapshot);

    let _ = app.emit("test-lights-end", ());
    if let Some(running) = app.try_state::<LightTestRunning>() {
        running.0.store(false, Ordering::SeqCst);
    }
}

fn genius_game_active(app: &AppHandle) -> bool {
    app.try_state::<GeniusGameRunning>()
        .is_some_and(|running| running.0.load(Ordering::SeqCst))
}

async fn start_genius_game(app: AppHandle) {
    if app
        .try_state::<GeniusGameRunning>()
        .is_none_or(|running| running.0.swap(true, Ordering::SeqCst))
    {
        return;
    }

    if app
        .try_state::<LightTestRunning>()
        .is_some_and(|running| running.0.load(Ordering::SeqCst))
    {
        if let Some(running) = app.try_state::<GeniusGameRunning>() {
            running.0.store(false, Ordering::SeqCst);
        }
        return;
    }

    let original = app
        .try_state::<TrayLight>()
        .map(|tray_light| *tray_light.0.read().unwrap_or_else(|e| e.into_inner()))
        .unwrap_or(LightState::Green);

    focus_main_window(&app);
    let _ = app.emit("genius-game-start", state_payload(StateSnapshot {
        state: original,
        awaiting_input: false,
    }));
}

#[tauri::command]
fn genius_preview_light(app: AppHandle, state: String) -> Result<(), String> {
    if !genius_game_active(&app) {
        return Err("genius game not running".to_string());
    }

    let parsed = LightState::parse(&state).ok_or_else(|| "invalid state".to_string())?;
    preview_light(&app, parsed);
    Ok(())
}

#[tauri::command]
async fn end_genius_game(app: AppHandle) -> Result<String, String> {
    if let Some(running) = app.try_state::<GeniusGameRunning>() {
        running.0.store(false, Ordering::SeqCst);
    }

    let snapshot = if let Some(sm) = app.try_state::<IpcStateMachine>() {
        let guard = sm.0.read().await;
        guard.snapshot()
    } else {
        StateSnapshot::default()
    };

    emit_state(&app, snapshot);
    Ok(light_state_name(snapshot.state).to_string())
}

#[tauri::command]
fn get_config() -> Config {
    Config::load()
}

#[tauri::command]
fn save_config(app: AppHandle, config: Config) -> Result<(), String> {
    config.save().map_err(|e| e.to_string())?;
    refresh_tray_icon(&app);
    Ok(())
}

#[tauri::command]
async fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|e| e.to_string())?;
    } else {
        autostart.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn sync_launch_hooks() -> Result<(), String> {
    install::sync_launch_hooks().map_err(|e| e.to_string())
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
fn restart_onboarding(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window.hide().map_err(|e| e.to_string())?;
    }
    if let Some(window) = app.get_webview_window("onboarding") {
        window.show().map_err(|e| e.to_string())?;
        window.center().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        let _ = app.emit("onboarding-restart", ());
    }
    Ok(())
}

#[tauri::command]
async fn apply_window_size(app: AppHandle, size: String, horizontal: bool) -> Result<(), String> {
    apply_main_window_size(&app, &size, horizontal)
}

fn apply_main_window_size(app: &AppHandle, size: &str, horizontal: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let (width, height) = window_dimensions(size, horizontal);
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
    if !matches!(stage, "green" | "yellow" | "red" | "awaiting_input") {
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

// ---------------------------------------------------------------------------
// Stream Deck integration
// ---------------------------------------------------------------------------

/// Returns the Elgato Stream Deck plugins directory for the current platform.
fn sd_plugins_dir() -> Option<std::path::PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA").ok().map(|p| {
            std::path::PathBuf::from(p)
                .join("Elgato")
                .join("StreamDeck")
                .join("Plugins")
        })
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME").ok().map(|h| {
            std::path::PathBuf::from(h)
                .join("Library")
                .join("Application Support")
                .join("com.elgato.StreamDeck")
                .join("Plugins")
        })
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        None
    }
}

fn copy_dir_recursively(
    src: &std::path::Path,
    dst: &std::path::Path,
) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let dst_path = dst.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_recursively(&entry.path(), &dst_path)?;
        } else {
            std::fs::copy(entry.path(), dst_path)?;
        }
    }
    Ok(())
}

/// Returns `true` when the Stream Deck software appears to be installed
/// (its plugins directory exists).
#[tauri::command]
fn detect_stream_deck() -> bool {
    sd_plugins_dir().is_some_and(|p| p.exists())
}

/// Copies the bundled `.sdPlugin` directory into the Stream Deck plugins folder.
#[tauri::command]
fn install_stream_deck(app: AppHandle) -> Result<(), String> {
    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    let src = resource_dir.join("com.semaphore.streamdeck.sdPlugin");
    if !src.exists() {
        return Err("bundled Stream Deck plugin not found in app resources".to_string());
    }
    let plugins_dir =
        sd_plugins_dir().ok_or_else(|| "Stream Deck plugins directory not found".to_string())?;
    let dst = plugins_dir.join("com.semaphore.streamdeck.sdPlugin");
    copy_dir_recursively(&src, &dst).map_err(|e| e.to_string())
}

const TRAY_ICON_ID: &str = "main";

#[derive(Clone)]
struct TrayLight(Arc<StdRwLock<LightState>>);

fn circle_tray_icon(state: LightState, theme_name: &str) -> Image<'static> {
    const SIZE: u32 = 44;
    let (r, g, b) = light_rgb(theme_name, state);
    let center = (SIZE as f32 - 1.0) / 2.0;
    let radius = center - 1.5;

    let mut rgba = vec![0u8; (SIZE * SIZE * 4) as usize];
    for y in 0..SIZE {
        for x in 0..SIZE {
            let dx = x as f32 - center;
            let dy = y as f32 - center;
            let dist = (dx * dx + dy * dy).sqrt();
            let alpha = if dist <= radius - 0.75 {
                255.0
            } else if dist <= radius + 0.75 {
                ((radius + 0.75 - dist) / 1.5 * 255.0).clamp(0.0, 255.0)
            } else {
                0.0
            };

            if alpha > 0.0 {
                let idx = ((y * SIZE + x) * 4) as usize;
                rgba[idx] = r;
                rgba[idx + 1] = g;
                rgba[idx + 2] = b;
                rgba[idx + 3] = alpha as u8;
            }
        }
    }

    Image::new_owned(rgba, SIZE, SIZE)
}

fn refresh_tray_icon(app: &AppHandle) {
    let state = app
        .try_state::<TrayLight>()
        .map(|tray_light| *tray_light.0.read().unwrap_or_else(|e| e.into_inner()))
        .unwrap_or(LightState::Green);
    let theme = Config::load().theme;

    if let Some(tray) = app.tray_by_id(TRAY_ICON_ID) {
        let _ = tray.set_icon(Some(circle_tray_icon(state, &theme)));
    }
}

fn emit_state(app: &AppHandle, snapshot: StateSnapshot) {
    if let Some(tray_light) = app.try_state::<TrayLight>() {
        if let Ok(mut current) = tray_light.0.write() {
            *current = snapshot.state;
        }
    }

    let payload = state_payload(snapshot);
    let _ = app.emit("state-changed", payload);
    refresh_tray_icon(app);
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
    let (width, height) = window_dimensions(&config.window.size, config.window.horizontal);
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
    let horizontal = CheckMenuItem::with_id(
        app,
        "horizontal",
        "Horizontal",
        true,
        config.window.horizontal,
        None::<&str>,
    )?;
    let always_on_top_toggle = always_on_top.clone();
    let horizontal_toggle = horizontal.clone();
    let test_lights = MenuItem::with_id(app, "test_lights", "Test Lights", true, None::<&str>)?;
    let play_genius = MenuItem::with_id(app, "play_genius", "Play Genius", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &show,
            &hide,
            &settings,
            &stealth,
            &always_on_top,
            &horizontal,
            &test_lights,
            &play_genius,
            &quit,
        ],
    )?;

    let _tray = TrayIconBuilder::with_id(TRAY_ICON_ID)
        .icon(circle_tray_icon(LightState::Green, &config.theme))
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
            "horizontal" => {
                let mut config = Config::load();
                config.window.horizontal = !config.window.horizontal;
                let _ = apply_main_window_size(
                    app,
                    &config.window.size,
                    config.window.horizontal,
                );
                let _ = horizontal_toggle.set_checked(config.window.horizontal);
                let _ = config.save();
                let _ = app.emit("config-changed", config);
            }
            "test_lights" => {
                tauri::async_runtime::spawn(run_light_test(app.clone()));
            }
            "play_genius" => {
                tauri::async_runtime::spawn(start_genius_game(app.clone()));
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
                Ok(snapshot) => emit_state(&app_handle, snapshot),
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
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            focus_main_window(app);
        }))
        .setup(move |app| {
            #[cfg(target_os = "macos")]
            {
                let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            let _ = install::prepare_runtime();
            app.manage(TrayLight(Arc::new(StdRwLock::new(LightState::Green))));
            app.manage(LightTestRunning(AtomicBool::new(false)));
            app.manage(GeniusGameRunning(AtomicBool::new(false)));
            app.manage(IpcStateMachine(Arc::clone(&machine_setup)));
            setup_tray(app.handle())?;
            start_ipc(app.handle(), machine_setup);

            if let Some(window) = app.get_webview_window("main") {
                setup_main_window(&window, &config)?;
            }

            if config.autostart {
                use tauri_plugin_autostart::ManagerExt;
                let _ = app.handle().autolaunch().enable();
            }

            let _ = install::sync_launch_hooks();

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
            restart_onboarding,
            apply_window_size,
            import_stage_sound,
            set_autostart,
            sync_launch_hooks,
            genius_preview_light,
            end_genius_game,
            detect_stream_deck,
            install_stream_deck
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
