use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    path::BaseDirectory,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, WebviewWindow, Wry,
};

const ACTIONS: [&str; 6] = ["sit", "relax", "sleep", "move", "interact", "special"];
const SETTINGS_FILE_NAME: &str = "settings.json";

#[derive(Debug)]
struct PetState {
    locked_on_top: bool,
    custom_asset_root_path: Option<PathBuf>,
}

impl Default for PetState {
    fn default() -> Self {
        Self {
            locked_on_top: true,
            custom_asset_root_path: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    asset_root_path: Option<PathBuf>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AssetBundle {
    root_path: String,
    files: Vec<String>,
    is_custom: bool,
}

#[tauri::command]
fn get_assets(app: AppHandle) -> Result<AssetBundle, String> {
    Ok(get_asset_bundle(&app))
}

#[tauri::command]
fn read_asset_file(app: AppHandle, file_name: String) -> Result<Vec<u8>, String> {
    let file_path = resolve_asset_file_path(&app, &file_name)?;
    fs::read(file_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn show_menu(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    let menu = build_context_menu(&app).map_err(|error| error.to_string())?;
    window.popup_menu(&menu).map_err(|error| error.to_string())
}

#[tauri::command]
fn choose_asset_folder(app: AppHandle) -> Result<(), String> {
    choose_asset_folder_inner(&app);
    Ok(())
}

#[tauri::command]
fn reset_asset_folder(app: AppHandle) -> Result<(), String> {
    reset_asset_folder_inner(&app);
    Ok(())
}

fn load_settings(app: &AppHandle) {
    let settings = read_settings(app);
    let custom_asset_root_path = settings
        .and_then(|settings| settings.asset_root_path)
        .filter(|path| path.is_dir());

    if let Ok(mut state) = app.state::<Mutex<PetState>>().lock() {
        state.custom_asset_root_path = custom_asset_root_path;
    }
}

fn read_settings(app: &AppHandle) -> Option<Settings> {
    let settings_path = settings_path(app).ok()?;
    let content = fs::read_to_string(settings_path).ok()?;
    serde_json::from_str(&content).ok()
}

fn save_settings(app: &AppHandle) {
    let asset_root_path = app
        .state::<Mutex<PetState>>()
        .lock()
        .ok()
        .and_then(|state| state.custom_asset_root_path.clone());

    let Some(settings_path) = settings_path(app).ok() else {
        return;
    };

    let settings = Settings { asset_root_path };
    if let Some(parent) = settings_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    if let Ok(content) = serde_json::to_string_pretty(&settings) {
        let _ = fs::write(settings_path, content);
    }
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, tauri::Error> {
    Ok(app.path().app_data_dir()?.join(SETTINGS_FILE_NAME))
}

fn get_asset_bundle(app: &AppHandle) -> AssetBundle {
    let root_path = get_asset_root_path(app);
    let is_custom = app
        .state::<Mutex<PetState>>()
        .lock()
        .ok()
        .and_then(|state| state.custom_asset_root_path.clone())
        .as_ref()
        .is_some_and(|custom_path| custom_path == &root_path);

    AssetBundle {
        files: get_asset_files(&root_path),
        root_path: path_to_string(&root_path),
        is_custom,
    }
}

fn get_asset_root_path(app: &AppHandle) -> PathBuf {
    if let Some(custom_path) = app
        .state::<Mutex<PetState>>()
        .lock()
        .ok()
        .and_then(|state| state.custom_asset_root_path.clone())
        .filter(|path| path.is_dir())
    {
        return custom_path;
    }

    get_default_asset_root_path(app)
}

fn get_default_asset_root_path(app: &AppHandle) -> PathBuf {
    let mut candidates = Vec::new();

    if let Ok(resource_assets) = app.path().resolve("assets", BaseDirectory::Resource) {
        candidates.push(resource_assets);
    }

    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        candidates.push(PathBuf::from(manifest_dir).join("..").join("assets"));
    }

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("assets"));
        candidates.push(current_dir.join("..").join("assets"));
    }

    candidates
        .into_iter()
        .find(|path| path.is_dir())
        .unwrap_or_else(|| PathBuf::from("assets"))
}

fn get_asset_files(asset_root_path: &Path) -> Vec<String> {
    let Ok(entries) = fs::read_dir(asset_root_path) else {
        return Vec::new();
    };

    let mut files: Vec<String> = entries
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_ok_and(|file_type| file_type.is_file()))
        .filter_map(|entry| {
            let path = entry.path();
            let is_webm = path
                .extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| extension.eq_ignore_ascii_case("webm"));

            if is_webm {
                entry.file_name().to_str().map(ToOwned::to_owned)
            } else {
                None
            }
        })
        .collect();

    files.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    files
}

fn resolve_asset_file_path(app: &AppHandle, file_name: &str) -> Result<PathBuf, String> {
    let file_path = Path::new(file_name);
    if file_path.is_absolute()
        || file_path
            .components()
            .any(|component| !matches!(component, std::path::Component::Normal(_)))
    {
        return Err("动作文件名无效。".to_string());
    }

    let is_webm = file_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("webm"));
    if !is_webm {
        return Err("只能读取 .webm 动作文件。".to_string());
    }

    let root_path = get_asset_root_path(app);
    let full_path = root_path.join(file_path);
    let canonical_root = root_path.canonicalize().map_err(|error| error.to_string())?;
    let canonical_file = full_path.canonicalize().map_err(|error| error.to_string())?;

    if !canonical_file.starts_with(canonical_root) {
        return Err("动作文件不在当前动作文件夹内。".to_string());
    }

    Ok(canonical_file)
}

fn get_asset_folder_label(app: &AppHandle) -> String {
    let root_path = get_asset_root_path(app);
    let is_custom = app
        .state::<Mutex<PetState>>()
        .lock()
        .ok()
        .and_then(|state| state.custom_asset_root_path.clone())
        .as_ref()
        .is_some_and(|custom_path| custom_path == &root_path);

    if !is_custom {
        return "内置 assets".to_string();
    }

    root_path
        .file_name()
        .and_then(|name| name.to_str())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| path_to_string(&root_path))
}

fn choose_asset_folder_inner(app: &AppHandle) {
    let picked_folder = rfd::FileDialog::new()
        .set_title("选择动作文件夹")
        .set_directory(get_asset_root_path(app))
        .pick_folder();

    let Some(next_root_path) = picked_folder else {
        return;
    };

    if get_asset_files(&next_root_path).is_empty() {
        let _ = rfd::MessageDialog::new()
            .set_title("没有找到动作文件")
            .set_description("这个文件夹里没有 .webm 动作文件，请选择包含 WebM 动作资源的文件夹。")
            .set_level(rfd::MessageLevel::Warning)
            .show();
        return;
    }

    if let Ok(mut state) = app.state::<Mutex<PetState>>().lock() {
        state.custom_asset_root_path = Some(next_root_path);
    }

    save_settings(app);
    notify_asset_bundle_changed(app);
}

fn reset_asset_folder_inner(app: &AppHandle) {
    if let Ok(mut state) = app.state::<Mutex<PetState>>().lock() {
        state.custom_asset_root_path = None;
    }

    save_settings(app);
    notify_asset_bundle_changed(app);
}

fn notify_asset_bundle_changed(app: &AppHandle) {
    let _ = app.emit_to("main", "pet:assets-changed", get_asset_bundle(app));
}

fn build_context_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let locked_on_top = app
        .state::<Mutex<PetState>>()
        .lock()
        .map(|state| state.locked_on_top)
        .unwrap_or(true);
    let has_custom_asset_root = app
        .state::<Mutex<PetState>>()
        .lock()
        .map(|state| state.custom_asset_root_path.is_some())
        .unwrap_or(false);

    let top_item = MenuItem::with_id(
        app,
        "toggle-on-top",
        if locked_on_top { "取消置顶" } else { "窗口置顶" },
        true,
        None::<&str>,
    )?;
    let action_items: Vec<MenuItem<tauri::Wry>> = ACTIONS
        .iter()
        .map(|action| {
            MenuItem::with_id(
                app,
                format!("action:{action}"),
                action_label(action),
                true,
                None::<&str>,
            )
        })
        .collect::<tauri::Result<_>>()?;

    let say_item = MenuItem::with_id(app, "say-random", "说点什么", true, None::<&str>)?;
    let sleep_item = MenuItem::with_id(app, "sleep", "休息一下", true, None::<&str>)?;
    let choose_folder_item =
        MenuItem::with_id(app, "choose-folder", "选择动作文件夹...", true, None::<&str>)?;
    let reset_folder_item = MenuItem::with_id(
        app,
        "reset-folder",
        "恢复默认动作文件夹",
        has_custom_asset_root,
        None::<&str>,
    )?;
    let folder_label = MenuItem::with_id(
        app,
        "folder-label",
        format!("当前动作文件夹：{}", get_asset_folder_label(app)),
        false,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app, "quit", "退出桌宠", true, None::<&str>)?;

    let separator_1 = PredefinedMenuItem::separator(app)?;
    let separator_2 = PredefinedMenuItem::separator(app)?;
    let separator_3 = PredefinedMenuItem::separator(app)?;
    let separator_4 = PredefinedMenuItem::separator(app)?;
    let settings_separator = PredefinedMenuItem::separator(app)?;
    let settings_menu = Submenu::with_items(
        app,
        "设置",
        true,
        &[&choose_folder_item, &reset_folder_item, &settings_separator, &folder_label],
    )?;

    let mut menu_items: Vec<&dyn tauri::menu::IsMenuItem<Wry>> = Vec::new();
    menu_items.push(&top_item);
    menu_items.push(&separator_1);
    for item in &action_items {
        menu_items.push(item);
    }
    menu_items.push(&separator_2);
    menu_items.push(&say_item);
    menu_items.push(&sleep_item);
    menu_items.push(&separator_3);
    menu_items.push(&settings_menu);
    menu_items.push(&separator_4);
    menu_items.push(&quit_item);

    Menu::with_items(app, &menu_items)
}

fn action_label(action: &str) -> &'static str {
    match action {
        "sit" => "坐下",
        "relax" => "放松",
        "sleep" => "睡觉",
        "move" => "活动",
        "interact" => "互动",
        "special" => "特别动作",
        _ => "动作",
    }
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    if let Some(action) = id.strip_prefix("action:") {
        let _ = app.emit_to("main", "pet:set-action", action);
        return;
    }

    match id {
        "toggle-on-top" => toggle_always_on_top(app),
        "say-random" => {
            let _ = app.emit_to("main", "pet:say-random", ());
        }
        "sleep" => {
            let _ = app.emit_to("main", "pet:set-action", "sleep");
        }
        "choose-folder" => choose_asset_folder_inner(app),
        "reset-folder" => reset_asset_folder_inner(app),
        "quit" => app.exit(0),
        _ => {}
    }
}

fn toggle_always_on_top(app: &AppHandle) {
    let locked_on_top = {
        let state_handle = app.state::<Mutex<PetState>>();
        let Ok(mut state) = state_handle.lock() else {
            return;
        };
        state.locked_on_top = !state.locked_on_top;
        state.locked_on_top
    };

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(locked_on_top);
    }
}

fn place_window_on_desktop(window: &WebviewWindow) -> tauri::Result<()> {
    let bounds = window.outer_size()?;
    let Some(monitor) = window.primary_monitor()? else {
        return Ok(());
    };
    let work_area = monitor.work_area();
    let x = work_area.position.x + work_area.size.width as i32 - bounds.width as i32 - 64;
    let y = work_area.position.y + work_area.size.height as i32 - bounds.height as i32 - 18;

    window.set_position(PhysicalPosition::new(x, y))
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(PetState::default()))
        .setup(|app| {
            load_settings(app.handle());

            if let Some(window) = app.get_webview_window("main") {
                let _ = place_window_on_desktop(&window);
                let _ = window.set_always_on_top(true);
                let _ = window.set_skip_taskbar(true);
            }

            let tray_menu = build_context_menu(app.handle())?;
            let mut tray_builder = TrayIconBuilder::with_id("main")
                .tooltip("Absolute protagonist")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| handle_menu_event(app, event.id.as_ref()))
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder.build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_assets,
            read_asset_file,
            show_menu,
            choose_asset_folder,
            reset_asset_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
