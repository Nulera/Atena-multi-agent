use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};

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
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("Failed to set pragmas: {}", e))?;

    Ok(conn)
}

pub fn get_conn() -> Result<Connection, String> {
    let conn =
        Connection::open(get_db_path()).map_err(|e| format!("Failed to open database: {}", e))?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("Failed to set pragmas: {}", e))?;
    Ok(conn)
}

pub fn schema_version(conn: &Connection) -> Result<usize, String> {
    conn.query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| format!("Failed to read schema version: {error}"))
}

pub fn backup_database(
    database_path: &Path,
    current_version: usize,
    target_version: usize,
) -> Result<Option<PathBuf>, String> {
    if current_version >= target_version || !database_path.exists() {
        return Ok(None);
    }

    let metadata = fs::metadata(database_path)
        .map_err(|error| format!("Failed to inspect database before migration: {error}"))?;
    if metadata.len() == 0 {
        return Ok(None);
    }

    let file_name = database_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("atena.db");
    let backup_path =
        database_path.with_file_name(format!("{file_name}.pre-v{target_version}.bak"));

    if !backup_path.exists() {
        fs::copy(database_path, &backup_path)
            .map_err(|error| format!("Failed to back up database before migration: {error}"))?;
    }

    Ok(Some(backup_path))
}

#[cfg(test)]
mod tests {
    use super::backup_database;
    use std::fs;

    #[test]
    fn creates_one_recoverable_backup_before_schema_upgrade() {
        let directory =
            std::env::temp_dir().join(format!("atena-backup-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&directory).expect("create temporary directory");
        let database = directory.join("atena.db");
        fs::write(&database, b"existing database").expect("write database");

        let backup = backup_database(&database, 0, 2)
            .expect("backup database")
            .expect("backup path");
        assert_eq!(
            fs::read(&backup).expect("read backup"),
            b"existing database"
        );

        fs::write(&database, b"changed").expect("change database");
        let repeated = backup_database(&database, 0, 2)
            .expect("repeat backup")
            .expect("existing backup path");
        assert_eq!(repeated, backup);
        assert_eq!(
            fs::read(&backup).expect("read original backup"),
            b"existing database"
        );

        fs::remove_dir_all(directory).expect("remove temporary directory");
    }
}
