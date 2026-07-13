use crate::db::connection::get_conn;
use crate::db::models::Setting;
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub fn get_setting(key: String) -> Result<Option<String>, String> {
    let conn = get_conn()?;
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row(rusqlite::params![key], |row| row.get::<_, String>(0))
        .ok();

    Ok(result)
}

#[tauri::command]
pub fn set_setting(key: String, value: String) -> Result<(), String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO settings (id, key, value, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4) ON CONFLICT(key) DO UPDATE SET value = ?3, updated_at = ?4",
        rusqlite::params![Uuid::new_v4().to_string(), key, value, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn list_settings() -> Result<Vec<Setting>, String> {
    let conn = get_conn()?;
    let mut stmt = conn
        .prepare("SELECT id, key, value, created_at, updated_at FROM settings ORDER BY key ASC")
        .map_err(|e| e.to_string())?;

    let settings = stmt
        .query_map([], |row| {
            Ok(Setting {
                id: row.get(0)?,
                key: row.get(1)?,
                value: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(settings)
}
