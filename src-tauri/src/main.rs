// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod commands;

use tauri::Manager;
use std::sync::Mutex;
use db::Database;

struct AppState {
    db: Mutex<Database>,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");

            let db_path = app_dir.join("prompt_caddy.db");
            let db = Database::new(db_path.to_str().expect("db path is not valid UTF-8")).expect("failed to initialize database");

            app.manage(AppState {
                db: Mutex::new(db),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Categories
            commands::get_categories,
            commands::create_category,
            commands::update_category,
            commands::delete_category,
            commands::toggle_category_pin,
            // Tags
            commands::get_tags,
            commands::create_tag,
            commands::update_tag,
            commands::delete_tag,
            // Prompts
            commands::get_prompts,
            commands::get_prompt_by_id,
            commands::create_prompt,
            commands::update_prompt,
            commands::delete_prompt,
            commands::toggle_favorite,
            commands::reorder_prompts,
            commands::reorder_categories,
            // Prompt-Tag relations
            commands::add_tag_to_prompt,
            commands::remove_tag_from_prompt,
            commands::get_prompt_tags,
            // Search
            commands::search_prompts,
            // Snapshots
            commands::get_snapshots,
            commands::create_snapshot,
            commands::restore_snapshot,
            commands::delete_snapshot,
            // Data management
            commands::clear_all_data,
            commands::move_prompts_to_category,
            // Export/Import
            commands::export_prompts_json,
            commands::export_prompts_markdown,
            commands::export_prompts_csv,
            commands::import_prompts_json,
            // Snapshot cleanup
            commands::delete_all_snapshots,
            // File system
            commands::save_file_to_path,
            commands::pick_directory,
            commands::get_default_export_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}