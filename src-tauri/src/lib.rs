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
const DEFAULT_WEBM_ASSET_ROOT: [&str; 2] = ["webm-assets", "绝对主角"];
const SUPPORTED_ASSET_EXTENSIONS: [&str; 4] = ["webm", "skel", "atlas", "png"];
const MAX_ASSET_FOLDER_SEARCH_DEPTH: usize = 4;
const DEFAULT_PET_SIZE_PERCENT: u32 = 100;
const MIN_PET_SIZE_PERCENT: u32 = 50;
const MAX_PET_SIZE_PERCENT: u32 = 200;
const PET_SIZE_STEP_PERCENT: u32 = 10;
const PET_SIZE_OPTIONS: [u32; 11] = [80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200];

#[derive(Debug)]
struct PetState {
    locked_on_top: bool,
    custom_asset_root_path: Option<PathBuf>,
    pet_size_percent: u32,
}

impl Default for PetState {
    fn default() -> Self {
        Self {
            locked_on_top: true,
            custom_asset_root_path: None,
            pet_size_percent: DEFAULT_PET_SIZE_PERCENT,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    asset_root_path: Option<PathBuf>,
    #[serde(default = "default_pet_size_percent")]
    pet_size_percent: u32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AssetBundle {
    renderer: String,
    root_path: String,
    files: Vec<String>,
    file_infos: Vec<AssetFileInfo>,
    is_custom: bool,
    profile: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AssetFileInfo {
    name: String,
    size: u64,
    modified_ms: u128,
}

#[derive(Debug, Clone)]
struct BuiltinSpineCharacter {
    id: String,
    name: String,
    asset_path: PathBuf,
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
fn get_pet_size(app: AppHandle) -> Result<u32, String> {
    Ok(current_pet_size_percent(&app))
}

fn load_settings(app: &AppHandle) {
    let settings = read_settings(app);
    let custom_asset_root_path = settings
        .as_ref()
        .and_then(|settings| settings.asset_root_path.clone())
        .filter(|path| path.is_dir());
    let pet_size_percent = settings
        .map(|settings| normalize_pet_size_percent(settings.pet_size_percent))
        .unwrap_or(DEFAULT_PET_SIZE_PERCENT);

    if let Ok(mut state) = app.state::<Mutex<PetState>>().lock() {
        state.custom_asset_root_path = custom_asset_root_path;
        state.pet_size_percent = pet_size_percent;
    }
}

fn read_settings(app: &AppHandle) -> Option<Settings> {
    let settings_path = settings_path(app).ok()?;
    let content = fs::read_to_string(settings_path).ok()?;
    serde_json::from_str(&content).ok()
}

fn default_pet_size_percent() -> u32 {
    DEFAULT_PET_SIZE_PERCENT
}

fn normalize_pet_size_percent(value: u32) -> u32 {
    value.clamp(MIN_PET_SIZE_PERCENT, MAX_PET_SIZE_PERCENT)
}

fn save_settings(app: &AppHandle) {
    let (asset_root_path, pet_size_percent) = app
        .state::<Mutex<PetState>>()
        .lock()
        .ok()
        .map(|state| {
            (
                state.custom_asset_root_path.clone(),
                normalize_pet_size_percent(state.pet_size_percent),
            )
        })
        .unwrap_or((None, DEFAULT_PET_SIZE_PERCENT));

    let Some(settings_path) = settings_path(app).ok() else {
        return;
    };

    let settings = Settings {
        asset_root_path,
        pet_size_percent,
    };
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
    let root_path = normalize_asset_root_path(get_asset_root_path(app));
    let file_infos = get_asset_file_infos(&root_path);
    let files = file_infos.iter().map(|info| info.name.clone()).collect();
    let renderer = detect_asset_renderer(&file_infos);
    let is_custom = app
        .state::<Mutex<PetState>>()
        .lock()
        .ok()
        .and_then(|state| state.custom_asset_root_path.clone())
        .as_ref()
        .is_some_and(|custom_path| custom_path == &root_path);

    AssetBundle {
        renderer,
        files,
        file_infos,
        root_path: path_to_string(&root_path),
        is_custom,
        profile: read_profile(&root_path),
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

fn normalize_asset_root_path(root_path: PathBuf) -> PathBuf {
    if is_usable_asset_folder(&root_path) {
        return root_path;
    }

    find_first_usable_child_asset_folder(&root_path).unwrap_or(root_path)
}

fn find_first_usable_child_asset_folder(root_path: &Path) -> Option<PathBuf> {
    find_first_usable_child_asset_folder_with_depth(root_path, MAX_ASSET_FOLDER_SEARCH_DEPTH)
}

fn find_first_usable_child_asset_folder_with_depth(root_path: &Path, depth: usize) -> Option<PathBuf> {
    if depth == 0 {
        return None;
    }

    let entries = fs::read_dir(root_path).ok()?;

    let mut child_dirs: Vec<PathBuf> = entries
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_ok_and(|file_type| file_type.is_dir()))
        .map(|entry| entry.path())
        .collect();
    child_dirs.sort_by(|a, b| {
        path_to_string(a)
            .to_lowercase()
            .cmp(&path_to_string(b).to_lowercase())
    });

    for child_dir in child_dirs {
        if is_usable_asset_folder(&child_dir) {
            return Some(child_dir);
        }

        if let Some(asset_path) =
            find_first_usable_child_asset_folder_with_depth(&child_dir, depth - 1)
        {
            return Some(asset_path);
        }
    }

    None
}

fn get_default_asset_root_path(app: &AppHandle) -> PathBuf {
    let mut candidates = Vec::new();

    if let Ok(resource_assets) = app
        .path()
        .resolve(DEFAULT_WEBM_ASSET_ROOT.join("/"), BaseDirectory::Resource)
    {
        candidates.push(resource_assets);
    }

    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        candidates.push(
            DEFAULT_WEBM_ASSET_ROOT
                .iter()
                .fold(PathBuf::from(manifest_dir).join(".."), |path, part| {
                    path.join(part)
                }),
        );
    }

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(
            DEFAULT_WEBM_ASSET_ROOT
                .iter()
                .fold(current_dir.clone(), |path, part| path.join(part)),
        );
        candidates.push(
            DEFAULT_WEBM_ASSET_ROOT
                .iter()
                .fold(current_dir.join(".."), |path, part| path.join(part)),
        );
    }

    candidates
        .into_iter()
        .find(|path| path.is_dir())
        .unwrap_or_else(|| DEFAULT_WEBM_ASSET_ROOT.iter().collect())
}

fn get_builtin_spine_root_path(app: &AppHandle) -> Option<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(resource_spine_assets) = app.path().resolve("spine-assets", BaseDirectory::Resource) {
        candidates.push(resource_spine_assets);
    }

    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        candidates.push(PathBuf::from(manifest_dir).join("..").join("spine-assets"));
    }

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("spine-assets"));
        candidates.push(current_dir.join("..").join("spine-assets"));
    }

    candidates.into_iter().find(|path| path.is_dir())
}

fn get_builtin_spine_characters(app: &AppHandle) -> Vec<BuiltinSpineCharacter> {
    let Some(spine_root_path) = get_builtin_spine_root_path(app) else {
        return Vec::new();
    };
    let Ok(entries) = fs::read_dir(spine_root_path) else {
        return Vec::new();
    };

    let mut characters: Vec<BuiltinSpineCharacter> = entries
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_ok_and(|file_type| file_type.is_dir()))
        .filter_map(|entry| {
            let name = entry.file_name().to_str()?.to_owned();
            let asset_path = normalize_asset_root_path(entry.path());
            if detect_asset_renderer(&get_asset_file_infos(&asset_path)) != "spine" {
                return None;
            }

            Some(BuiltinSpineCharacter {
                id: sanitize_menu_id(&name),
                name,
                asset_path,
            })
        })
        .collect();

    characters.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    characters
}

fn detect_asset_renderer(file_infos: &[AssetFileInfo]) -> String {
    let has_skel = file_infos
        .iter()
        .any(|info| has_extension(&info.name, "skel"));
    let has_atlas = file_infos
        .iter()
        .any(|info| has_extension(&info.name, "atlas"));
    let has_png = file_infos
        .iter()
        .any(|info| has_extension(&info.name, "png"));

    if has_skel && has_atlas && has_png {
        "spine".to_string()
    } else {
        "webm".to_string()
    }
}

fn get_asset_file_infos(asset_root_path: &Path) -> Vec<AssetFileInfo> {
    let Ok(entries) = fs::read_dir(asset_root_path) else {
        return Vec::new();
    };

    let mut file_infos: Vec<AssetFileInfo> = entries
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_ok_and(|file_type| file_type.is_file()))
        .filter_map(|entry| {
            let path = entry.path();
            let is_supported = path
                .extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| {
                    SUPPORTED_ASSET_EXTENSIONS
                        .iter()
                        .any(|supported| extension.eq_ignore_ascii_case(supported))
                });

            if !is_supported {
                return None;
            }

            let metadata = entry.metadata().ok()?;
            let modified_ms = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis())
                .unwrap_or_default();

            Some(AssetFileInfo {
                name: entry.file_name().to_str()?.to_owned(),
                size: metadata.len(),
                modified_ms,
            })
        })
        .collect();

    file_infos.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    file_infos
}

fn read_profile(asset_root_path: &Path) -> Option<serde_json::Value> {
    let content = fs::read_to_string(asset_root_path.join("profile.json")).ok()?;
    serde_json::from_str(&content).ok()
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

    let is_supported = file_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            SUPPORTED_ASSET_EXTENSIONS
                .iter()
                .any(|supported| extension.eq_ignore_ascii_case(supported))
        });
    if !is_supported {
        return Err("只能读取支持的素材文件。".to_string());
    }

    let root_path = normalize_asset_root_path(get_asset_root_path(app));
    let full_path = root_path.join(file_path);
    let canonical_root = root_path
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let canonical_file = full_path
        .canonicalize()
        .map_err(|error| error.to_string())?;

    if !canonical_file.starts_with(canonical_root) {
        return Err("动作文件不在当前动作文件夹内。".to_string());
    }

    Ok(canonical_file)
}

fn has_extension(file_name: &str, extension: &str) -> bool {
    Path::new(file_name)
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case(extension))
}

fn sanitize_menu_id(value: &str) -> String {
    value
        .as_bytes()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn get_asset_folder_label(app: &AppHandle) -> String {
    let root_path = normalize_asset_root_path(get_asset_root_path(app));
    let is_custom = app
        .state::<Mutex<PetState>>()
        .lock()
        .ok()
        .and_then(|state| state.custom_asset_root_path.clone())
        .as_ref()
        .is_some_and(|custom_path| custom_path == &root_path);

    if !is_custom {
        return "内置 webm-assets\\绝对主角".to_string();
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

    if !is_usable_asset_folder(&next_root_path) {
        if let Some(child_path) = find_first_usable_child_asset_folder(&next_root_path) {
            if let Ok(mut state) = app.state::<Mutex<PetState>>().lock() {
                state.custom_asset_root_path = Some(child_path);
            }

            save_settings(app);
            notify_asset_bundle_changed(app);
            return;
        } else {
            let _ = rfd::MessageDialog::new()
                .set_title("没有找到动作文件")
                .set_description("这个文件夹里没有可用素材，请选择包含 WebM 动作或 Spine skel/atlas/png 的文件夹。")
                .set_level(rfd::MessageLevel::Warning)
                .show();
            return;
        }
    }

    if let Ok(mut state) = app.state::<Mutex<PetState>>().lock() {
        state.custom_asset_root_path = Some(next_root_path);
    }

    save_settings(app);
    notify_asset_bundle_changed(app);
}

fn is_usable_asset_folder(asset_root_path: &Path) -> bool {
    let file_infos = get_asset_file_infos(asset_root_path);
    if file_infos
        .iter()
        .any(|info| has_extension(&info.name, "webm"))
    {
        return true;
    }

    detect_asset_renderer(&file_infos) == "spine"
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

fn current_pet_size_percent(app: &AppHandle) -> u32 {
    app.state::<Mutex<PetState>>()
        .lock()
        .map(|state| normalize_pet_size_percent(state.pet_size_percent))
        .unwrap_or(DEFAULT_PET_SIZE_PERCENT)
}

fn notify_pet_size_changed(app: &AppHandle) {
    let _ = app.emit_to("main", "pet:size-changed", current_pet_size_percent(app));
}

fn set_pet_size_percent(app: &AppHandle, percent: u32) {
    let next_percent = normalize_pet_size_percent(percent);

    if let Ok(mut state) = app.state::<Mutex<PetState>>().lock() {
        state.pet_size_percent = next_percent;
    }

    save_settings(app);
    notify_pet_size_changed(app);
}

fn adjust_pet_size_percent(app: &AppHandle, delta: i32) {
    let current = current_pet_size_percent(app) as i32;
    let next = (current + delta).clamp(MIN_PET_SIZE_PERCENT as i32, MAX_PET_SIZE_PERCENT as i32);
    set_pet_size_percent(app, next as u32);
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
    let pet_size_percent = current_pet_size_percent(app);

    let top_item = MenuItem::with_id(
        app,
        "toggle-on-top",
        if locked_on_top {
            "取消置顶"
        } else {
            "窗口置顶"
        },
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
    let choose_folder_item = MenuItem::with_id(
        app,
        "choose-folder",
        "选择动作文件夹...",
        true,
        None::<&str>,
    )?;
    let reset_folder_item = MenuItem::with_id(
        app,
        "reset-folder",
        "恢复默认动作文件夹",
        has_custom_asset_root,
        None::<&str>,
    )?;
    let size_smaller_item = MenuItem::with_id(
        app,
        "pet-size:smaller",
        "缩小 10%",
        pet_size_percent > MIN_PET_SIZE_PERCENT,
        None::<&str>,
    )?;
    let size_larger_item = MenuItem::with_id(
        app,
        "pet-size:larger",
        "放大 10%",
        pet_size_percent < MAX_PET_SIZE_PERCENT,
        None::<&str>,
    )?;
    let size_reset_item = MenuItem::with_id(
        app,
        "pet-size:100",
        "恢复 100%",
        pet_size_percent != DEFAULT_PET_SIZE_PERCENT,
        None::<&str>,
    )?;
    let size_separator = PredefinedMenuItem::separator(app)?;
    let size_option_items: Vec<MenuItem<tauri::Wry>> = PET_SIZE_OPTIONS
        .iter()
        .map(|percent| {
            let label = if *percent == pet_size_percent {
                format!("✓ {percent}%")
            } else {
                format!("{percent}%")
            };
            MenuItem::with_id(
                app,
                format!("pet-size:{percent}"),
                label,
                *percent != pet_size_percent,
                None::<&str>,
            )
        })
        .collect::<tauri::Result<_>>()?;
    let mut size_menu_items: Vec<&dyn tauri::menu::IsMenuItem<Wry>> = Vec::new();
    size_menu_items.push(&size_smaller_item);
    size_menu_items.push(&size_larger_item);
    size_menu_items.push(&size_reset_item);
    size_menu_items.push(&size_separator);
    for item in &size_option_items {
        size_menu_items.push(item);
    }
    let size_menu = Submenu::with_items(
        app,
        format!("桌宠大小：{pet_size_percent}%"),
        true,
        &size_menu_items,
    )?;
    let builtin_spine_characters = get_builtin_spine_characters(app);
    let builtin_spine_items: Vec<MenuItem<tauri::Wry>> = builtin_spine_characters
        .iter()
        .take(80)
        .map(|character| {
            MenuItem::with_id(
                app,
                format!("builtin-spine:{}", character.id),
                &character.name,
                true,
                None::<&str>,
            )
        })
        .collect::<tauri::Result<_>>()?;
    let builtin_spine_limit_item = MenuItem::with_id(
        app,
        "builtin-spine-limit",
        format!("仅显示前 80 个，共 {} 个", builtin_spine_characters.len()),
        false,
        None::<&str>,
    )?;
    let mut builtin_spine_menu_items: Vec<&dyn tauri::menu::IsMenuItem<Wry>> = Vec::new();
    for item in &builtin_spine_items {
        builtin_spine_menu_items.push(item);
    }
    if builtin_spine_characters.len() > builtin_spine_items.len() {
        builtin_spine_menu_items.push(&builtin_spine_limit_item);
    }
    let builtin_spine_menu = Submenu::with_items(
        app,
        "内置 Spine 角色",
        !builtin_spine_menu_items.is_empty(),
        &builtin_spine_menu_items,
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
        &[
            &choose_folder_item,
            &reset_folder_item,
            &size_menu,
            &builtin_spine_menu,
            &settings_separator,
            &folder_label,
        ],
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

    if let Some(character_id) = id.strip_prefix("builtin-spine:") {
        choose_builtin_spine_character(app, character_id);
        return;
    }

    if let Some(size_action) = id.strip_prefix("pet-size:") {
        match size_action {
            "smaller" => adjust_pet_size_percent(app, -(PET_SIZE_STEP_PERCENT as i32)),
            "larger" => adjust_pet_size_percent(app, PET_SIZE_STEP_PERCENT as i32),
            percent => {
                if let Ok(percent) = percent.parse::<u32>() {
                    set_pet_size_percent(app, percent);
                }
            }
        }
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

fn choose_builtin_spine_character(app: &AppHandle, character_id: &str) {
    let Some(character) = get_builtin_spine_characters(app)
        .into_iter()
        .find(|character| character.id == character_id)
    else {
        return;
    };

    if let Ok(mut state) = app.state::<Mutex<PetState>>().lock() {
        state.custom_asset_root_path = Some(character.asset_path);
    }

    save_settings(app);
    notify_asset_bundle_changed(app);
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
    let visual_content_width = 320;
    let horizontal_margin = ((bounds.width as i32 - visual_content_width) / 2).max(0);
    let x = work_area.position.x + work_area.size.width as i32
        - horizontal_margin
        - visual_content_width
        - 64;
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
            get_pet_size
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
