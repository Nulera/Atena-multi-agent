use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;

fn get_db_dir() -> PathBuf {
    let mut path = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("atena");
    if !path.exists() {
        fs::create_dir_all(&path).ok();
    }
    path
}

pub fn get_db_path() -> PathBuf {
    get_db_dir().join("atena.db")
}

pub fn init_db() -> Result<Connection, String> {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("Failed to set pragmas: {}", e))?;

    Ok(conn)
}

pub fn get_conn() -> Result<Connection, String> {
    let conn = Connection::open(get_db_path())
        .map_err(|e| format!("Failed to open database: {}", e))?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("Failed to set pragmas: {}", e))?;
    Ok(conn)
}
