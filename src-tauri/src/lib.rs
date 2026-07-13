pub mod commands;
pub mod db;

use db::{connection::init_db, migrations::run_migrations};
use tauri::Builder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let conn = init_db().expect("Failed to initialize database");
    run_migrations(&conn).expect("Failed to run migrations");
    drop(conn);

    Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::workspaces::list_workspaces,
            commands::workspaces::create_workspace,
            commands::workspaces::update_workspace,
            commands::workspaces::delete_workspace,
            commands::agents::list_agents,
            commands::agents::create_agent,
            commands::agents::update_agent,
            commands::agents::delete_agent,
            commands::sessions::list_sessions,
            commands::sessions::create_session,
            commands::sessions::update_session,
            commands::sessions::delete_session,
            commands::sessions::add_session_log,
            commands::sessions::list_session_logs,
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::list_settings,
            commands::fs::validate_path,
            commands::fs::path_exists,
            commands::pty::spawn_process,
            commands::pty::write_to_process,
            commands::pty::kill_process,
            commands::pty::list_processes,
            commands::layouts::list_layouts,
            commands::layouts::save_layout,
            commands::layouts::get_default_layout,
            commands::layouts::delete_layout,
            commands::git::git_status,
            commands::git::git_diff,
            commands::git::git_diff_staged,
            commands::git::git_current_branch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
