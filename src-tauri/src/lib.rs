pub mod commands;
pub mod db;
pub mod repositories;

use db::{
    connection::{backup_database, get_db_path, init_db, schema_version},
    migrations::{run_migrations, LATEST_SCHEMA_VERSION},
};
use tauri::Builder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let conn = init_db().expect("Failed to initialize database");
    let current_version = schema_version(&conn).expect("Failed to read database version");
    backup_database(&get_db_path(), current_version, LATEST_SCHEMA_VERSION)
        .expect("Failed to back up database before migration");
    run_migrations(&conn).expect("Failed to run migrations");
    drop(conn);

    Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }
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
            commands::sessions::export_session,
            commands::orchestrations::save_orchestration,
            commands::orchestrations::load_latest_orchestration,
            commands::orchestrations::delete_orchestration,
            commands::orchestrations::append_orchestration_event,
            commands::orchestrations::list_orchestration_events,
            commands::orchestrations::list_squad_templates,
            commands::orchestrations::save_squad_template,
            commands::orchestrations::delete_squad_template,
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::list_settings,
            commands::fs::validate_path,
            commands::fs::path_exists,
            commands::pty::spawn_process,
            commands::pty::write_to_process,
            commands::pty::resize_process,
            commands::pty::kill_process,
            commands::pty::list_processes,
            commands::pty::detach_process,
            commands::pty::attach_process,
            commands::pty::get_scrollback,
            commands::layouts::list_layouts,
            commands::layouts::save_layout,
            commands::layouts::get_default_layout,
            commands::layouts::delete_layout,
            commands::git::git_status,
            commands::git::git_diff,
            commands::git::git_diff_staged,
            commands::git::git_current_branch,
            commands::git::git_init,
            commands::git::git_set_identity,
            commands::git::git_set_remote,
            commands::git::git_commit_all,
            commands::git::git_pull,
            commands::git::git_push,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
