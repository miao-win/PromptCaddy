use tauri::State;
use serde::Deserialize;
use crate::AppState;
use crate::db::{Category, Tag, Prompt, Snapshot, SearchResult};

#[derive(Deserialize)]
pub struct SortOrder {
    pub id: String,
    pub sort_order: i32,
}

// Categories
#[tauri::command]
pub fn get_categories(state: State<AppState>) -> Result<Vec<Category>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_categories().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_category(state: State<AppState>, name: String, parent_id: Option<String>) -> Result<Category, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_category(&name, parent_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_category(state: State<AppState>, id: String, name: String, parent_id: Option<String>, sort_order: i32) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_category(&id, &name, parent_id.as_deref(), sort_order).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_category(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_category(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_category_pin(state: State<AppState>, id: String) -> Result<i32, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.toggle_category_pin(&id).map_err(|e| e.to_string())
}

// Tags
#[tauri::command]
pub fn get_tags(state: State<AppState>) -> Result<Vec<Tag>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_tags().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_tag(state: State<AppState>, name: String) -> Result<Tag, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_tag(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_tag(state: State<AppState>, id: String, name: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_tag(&id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_tag(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_tag(&id).map_err(|e| e.to_string())
}

// Prompts
#[tauri::command]
pub fn get_prompts(state: State<AppState>, category_id: Option<String>, favorites_only: bool) -> Result<Vec<Prompt>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_prompts(category_id.as_deref(), favorites_only).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_prompt_by_id(state: State<AppState>, id: String) -> Result<Prompt, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_prompt_by_id(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_prompt(state: State<AppState>, title: String, content: String, remark: Option<String>, category_id: Option<String>) -> Result<Prompt, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_prompt(&title, &content, remark.as_deref(), category_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_prompt(state: State<AppState>, id: String, title: String, content: String, remark: Option<String>, category_id: Option<String>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_prompt(&id, &title, &content, remark.as_deref(), category_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_prompt(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_prompt(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_favorite(state: State<AppState>, id: String) -> Result<i32, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.toggle_favorite(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reorder_prompts(state: State<AppState>, orders: Vec<SortOrder>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let tuples: Vec<(String, i32)> = orders.into_iter().map(|o| (o.id, o.sort_order)).collect();
    db.reorder_prompts(&tuples).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reorder_categories(state: State<AppState>, orders: Vec<SortOrder>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let tuples: Vec<(String, i32)> = orders.into_iter().map(|o| (o.id, o.sort_order)).collect();
    db.reorder_categories(&tuples).map_err(|e| e.to_string())
}

// Prompt-Tag relations
#[tauri::command]
pub fn add_tag_to_prompt(state: State<AppState>, prompt_id: String, tag_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.add_tag_to_prompt(&prompt_id, &tag_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_tag_from_prompt(state: State<AppState>, prompt_id: String, tag_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.remove_tag_from_prompt(&prompt_id, &tag_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_prompt_tags(state: State<AppState>, prompt_id: String) -> Result<Vec<Tag>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_prompt_tags(&prompt_id).map_err(|e| e.to_string())
}

// Search
#[tauri::command]
pub fn search_prompts(state: State<AppState>, query: String) -> Result<Vec<SearchResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.search_prompts(&query).map_err(|e| e.to_string())
}

// Snapshots
#[tauri::command]
pub fn get_snapshots(state: State<AppState>) -> Result<Vec<Snapshot>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_snapshots().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_snapshot(state: State<AppState>, name: Option<String>) -> Result<Snapshot, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_snapshot(name.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn restore_snapshot(state: State<AppState>, snapshot_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.restore_snapshot(&snapshot_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_snapshot(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_snapshot(&id).map_err(|e| e.to_string())
}

// Data management
#[tauri::command]
pub fn clear_all_data(state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.clear_all_data().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn move_prompts_to_category(state: State<AppState>, prompt_ids: Vec<String>, category_id: Option<String>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.move_prompts_to_category(&prompt_ids, category_id.as_deref()).map_err(|e| e.to_string())
}

// Export/Import
#[tauri::command]
pub fn export_prompts_json(state: State<AppState>, prompt_ids: Vec<String>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    if prompt_ids.is_empty() {
        db.export_all_json().map_err(|e| e.to_string())
    } else {
        db.export_prompts_json(&prompt_ids).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn export_prompts_markdown(state: State<AppState>, prompt_ids: Vec<String>) -> Result<Vec<(String, String)>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut files = Vec::new();

    for id in &prompt_ids {
        let prompt = db.get_prompt_by_id(id).map_err(|e| e.to_string())?;
        let filename = format!("{}.md", prompt.title);
        let content = format!("# {}\n\n{}", prompt.title, prompt.content);
        files.push((filename, content));
    }

    Ok(files)
}

/// Escape a value for CSV format: wrap in quotes if it contains comma, quote, or newline.
/// Also prevents CSV injection by prefixing dangerous leading characters.
fn csv_escape(value: &str) -> String {
    // Prevent CSV injection: prefix dangerous leading characters
    let safe_value = if value.starts_with('=') || value.starts_with('+') || value.starts_with('-') || value.starts_with('@') {
        format!("'{}", value)
    } else {
        value.to_string()
    };
    if safe_value.contains(',') || safe_value.contains('"') || safe_value.contains('\n') || safe_value.contains('\r') {
        let escaped = safe_value.replace('"', "\"\"");
        format!("\"{}\"", escaped)
    } else {
        safe_value
    }
}

#[tauri::command]
pub fn export_prompts_csv(state: State<AppState>, prompt_ids: Vec<String>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // Add UTF-8 BOM for correct encoding display in Chinese Windows Excel
    let mut csv = String::from("\u{FEFF}标题,正文,分类,标签\n");

    for id in &prompt_ids {
        let prompt = db.get_prompt_by_id(id).map_err(|e| e.to_string())?;
        let tags = db.get_prompt_tags(id).map_err(|e| e.to_string())?;

        let category_name = if let Some(cid) = &prompt.category_id {
            let categories = db.get_categories().map_err(|e| e.to_string())?;
            categories.iter().find(|c| &c.id == cid).map(|c| c.name.clone()).unwrap_or_default()
        } else {
            String::new()
        };

        let tag_names: Vec<String> = tags.iter().map(|t| t.name.clone()).collect();
        let tags_str = tag_names.join("; ");

        csv.push_str(&format!("{},{},{},{}\n",
            csv_escape(&prompt.title),
            csv_escape(&prompt.content),
            csv_escape(&category_name),
            csv_escape(&tags_str)
        ));
    }

    Ok(csv)
}

#[tauri::command]
pub fn import_prompts_json(state: State<AppState>, json_data: String, strategy: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.import_json(&json_data, &strategy).map_err(|e| e.to_string())
}

// Snapshot cleanup
#[tauri::command]
pub fn delete_all_snapshots(state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_all_snapshots().map_err(|e| e.to_string())
}

// File system operations
#[tauri::command]
pub fn save_file_to_path(path: String, content: String) -> Result<(), String> {
    // Basic path safety: reject paths with ".." to prevent traversal
    if path.contains("..") {
        return Err("路径不允许包含 .. 以防止路径遍历".to_string());
    }
    // Ensure parent directory exists
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("无法创建目录: {}", e))?;
    }
    std::fs::write(&path, content).map_err(|e| format!("无法写入文件: {}", e))
}

#[tauri::command]
pub async fn pick_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::mpsc;
    let (tx, rx) = mpsc::channel();
    app.dialog().file().pick_folder(move |folder| {
        let _ = tx.send(folder.map(|f| f.to_string()));
    });
    rx.recv().map_err(|e| format!("对话框错误: {}", e))
}

#[tauri::command]
pub fn get_default_export_path() -> String {
    // Try Downloads directory first, then Documents
    if let Some(home) = dirs_next::home_dir() {
        let downloads = home.join("Downloads");
        if downloads.exists() {
            return downloads.to_string_lossy().to_string();
        }
        let documents = home.join("Documents");
        if documents.exists() {
            return documents.to_string_lossy().to_string();
        }
        return home.to_string_lossy().to_string();
    }
    // Fallback
    if cfg!(target_os = "windows") {
        "C:\\Users".to_string()
    } else {
        "/tmp".to_string()
    }
}