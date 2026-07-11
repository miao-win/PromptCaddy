use tauri::State;
use crate::AppState;
use crate::db::{Category, Tag, Prompt, Variant, Snapshot, SearchResult};

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

// Tags
#[tauri::command]
pub fn get_tags(state: State<AppState>) -> Result<Vec<Tag>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_tags().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_tag(state: State<AppState>, name: String, color: String) -> Result<Tag, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_tag(&name, &color).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_tag(state: State<AppState>, id: String, name: String, color: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_tag(&id, &name, &color).map_err(|e| e.to_string())
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

// Variants
#[tauri::command]
pub fn get_variants(state: State<AppState>, prompt_id: String) -> Result<Vec<Variant>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_variants(&prompt_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_variant(state: State<AppState>, prompt_id: String, name: String, content: String) -> Result<Variant, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_variant(&prompt_id, &name, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_variant(state: State<AppState>, id: String, name: String, content: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_variant(&id, &name, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_variant(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_variant(&id).map_err(|e| e.to_string())
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
        let variants = db.get_variants(id).map_err(|e| e.to_string())?;

        if variants.is_empty() {
            let filename = format!("{}.md", prompt.title);
            let content = format!("# {}\n\n{}", prompt.title, prompt.content);
            files.push((filename, content));
        } else {
            for variant in &variants {
                let filename = format!("{}_{}.md", prompt.title, variant.name);
                let content = format!("# {} - {}\n\n{}", prompt.title, variant.name, variant.content);
                files.push((filename, content));
            }
        }
    }

    Ok(files)
}

/// Escape a value for CSV format: wrap in quotes if it contains comma, quote, or newline.
fn csv_escape(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') || value.contains('\r') {
        let escaped = value.replace('"', "\"\"");
        format!("\"{}\"", escaped)
    } else {
        value.to_string()
    }
}

#[tauri::command]
pub fn export_prompts_csv(state: State<AppState>, prompt_ids: Vec<String>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut csv = String::from("Prompt标题,变体名称,正文,分类,标签\n");

    for id in &prompt_ids {
        let prompt = db.get_prompt_by_id(id).map_err(|e| e.to_string())?;
        let variants = db.get_variants(id).map_err(|e| e.to_string())?;
        let tags = db.get_prompt_tags(id).map_err(|e| e.to_string())?;

        let category_name = if let Some(cid) = &prompt.category_id {
            let categories = db.get_categories().map_err(|e| e.to_string())?;
            categories.iter().find(|c| &c.id == cid).map(|c| c.name.clone()).unwrap_or_default()
        } else {
            String::new()
        };

        let tag_names: Vec<String> = tags.iter().map(|t| t.name.clone()).collect();
        let tags_str = tag_names.join("; ");

        if variants.is_empty() {
            csv.push_str(&format!("{},{},{},{},{}\n",
                csv_escape(&prompt.title),
                csv_escape(""),
                csv_escape(&prompt.content),
                csv_escape(&category_name),
                csv_escape(&tags_str)
            ));
        } else {
            for variant in &variants {
                csv.push_str(&format!("{},{},{},{},{}\n",
                    csv_escape(&prompt.title),
                    csv_escape(&variant.name),
                    csv_escape(&variant.content),
                    csv_escape(&category_name),
                    csv_escape(&tags_str)
                ));
            }
        }
    }

    Ok(csv)
}

#[tauri::command]
pub fn import_prompts_json(state: State<AppState>, json_data: String, strategy: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.import_json(&json_data, &strategy).map_err(|e| e.to_string())
}