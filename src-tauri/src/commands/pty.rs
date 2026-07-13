use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

const MAX_SCROLLBACK: usize = 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub id: String,
    pub agent_id: Option<String>,
    pub command: String,
    pub working_dir: String,
    pub pid: Option<u32>,
    pub running: bool,
    pub attached: bool,
    pub scrollback: String,
}

struct ProcessEntry {
    master: Box<dyn MasterPty + Send>,
    child: Box<dyn Child + Send + Sync>,
    writer: Box<dyn Write + Send>,
    agent_id: Option<String>,
    command: String,
    working_dir: String,
    scrollback: String,
    attached: bool,
    running: bool,
}

static PROCESSES: Mutex<Option<HashMap<String, Mutex<ProcessEntry>>>> = Mutex::new(None);

fn processes() -> &'static Mutex<Option<HashMap<String, Mutex<ProcessEntry>>>> {
    &PROCESSES
}

fn process_info(id: String, entry: &ProcessEntry, include_scrollback: bool) -> ProcessInfo {
    ProcessInfo {
        id,
        agent_id: entry.agent_id.clone(),
        command: entry.command.clone(),
        working_dir: entry.working_dir.clone(),
        pid: entry.child.process_id(),
        running: entry.running,
        attached: entry.attached,
        scrollback: if include_scrollback {
            entry.scrollback.clone()
        } else {
            String::new()
        },
    }
}

#[cfg(target_os = "windows")]
fn shell_command() -> CommandBuilder {
    let mut command = CommandBuilder::new("powershell.exe");
    command.args(["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass"]);
    command
}

#[cfg(not(target_os = "windows"))]
fn shell_command() -> CommandBuilder {
    CommandBuilder::new_default_prog()
}

#[tauri::command]
pub fn spawn_process(
    app: AppHandle,
    command: String,
    working_dir: String,
    agent_id: Option<String>,
) -> Result<ProcessInfo, String> {
    let id = Uuid::new_v4().to_string();
    let pair = native_pty_system()
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| format!("Failed to open PTY: {error}"))?;

    let mut shell = shell_command();
    shell.cwd(&working_dir);

    let child = pair
        .slave
        .spawn_command(shell)
        .map_err(|error| format!("Failed to spawn shell: {error}"))?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| format!("Failed to open PTY reader: {error}"))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|error| format!("Failed to open PTY writer: {error}"))?;

    let entry = ProcessEntry {
        master: pair.master,
        child,
        writer,
        agent_id: agent_id.clone(),
        command: command.clone(),
        working_dir: working_dir.clone(),
        scrollback: String::new(),
        // Output stays in scrollback until the frontend has registered its listeners.
        attached: false,
        running: true,
    };
    let info = process_info(id.clone(), &entry, false);

    {
        let mut store = processes()
            .lock()
            .map_err(|error| format!("Process store lock failed: {error}"))?;
        store
            .get_or_insert_with(HashMap::new)
            .insert(id.clone(), Mutex::new(entry));
    }

    let reader_id = id.clone();
    thread::spawn(move || {
        let mut buffer = [0u8; 8192];
        loop {
            let count = match reader.read(&mut buffer) {
                Ok(0) | Err(_) => break,
                Ok(count) => count,
            };
            let data = String::from_utf8_lossy(&buffer[..count]).into_owned();
            let should_emit = if let Ok(mut store) = processes().lock() {
                if let Some(entry) = store
                    .as_mut()
                    .and_then(|map| map.get(&reader_id))
                    .and_then(|entry| entry.lock().ok())
                {
                    let mut entry = entry;
                    entry.scrollback.push_str(&data);
                    if entry.scrollback.len() > MAX_SCROLLBACK {
                        let split = entry.scrollback.len() - MAX_SCROLLBACK;
                        let split = entry.scrollback.ceil_char_boundary(split);
                        entry.scrollback.drain(..split);
                    }
                    entry.attached
                } else {
                    false
                }
            } else {
                false
            };
            if should_emit {
                let _ = app.emit(&format!("pty:{reader_id}:output"), &data);
            }
        }

        if let Ok(mut store) = processes().lock() {
            if let Some(entry) = store
                .as_mut()
                .and_then(|map| map.get(&reader_id))
                .and_then(|entry| entry.lock().ok())
            {
                let mut entry = entry;
                entry.running = false;
            }
        }
        let _ = app.emit(&format!("pty:{reader_id}:exit"), ());
    });

    if !command.trim().is_empty() {
        write_to_process(id.clone(), format!("{command}\r"))?;
    }

    Ok(info)
}

#[tauri::command]
pub fn write_to_process(id: String, data: String) -> Result<(), String> {
    let store = processes()
        .lock()
        .map_err(|error| format!("Process store lock failed: {error}"))?;
    let entry = store
        .as_ref()
        .and_then(|map| map.get(&id))
        .ok_or_else(|| "Process not found".to_string())?;
    let mut entry = entry
        .lock()
        .map_err(|error| format!("Process lock failed: {error}"))?;
    entry
        .writer
        .write_all(data.as_bytes())
        .and_then(|_| entry.writer.flush())
        .map_err(|error| format!("PTY write failed: {error}"))
}

#[tauri::command]
pub fn resize_process(id: String, rows: u16, cols: u16) -> Result<(), String> {
    let store = processes()
        .lock()
        .map_err(|error| format!("Process store lock failed: {error}"))?;
    let entry = store
        .as_ref()
        .and_then(|map| map.get(&id))
        .ok_or_else(|| "Process not found".to_string())?;
    let entry = entry
        .lock()
        .map_err(|error| format!("Process lock failed: {error}"))?;
    entry
        .master
        .resize(PtySize {
            rows: rows.max(1),
            cols: cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| format!("PTY resize failed: {error}"))
}

#[tauri::command]
pub fn detach_process(id: String) -> Result<(), String> {
    let store = processes()
        .lock()
        .map_err(|error| format!("Process store lock failed: {error}"))?;
    let entry = store
        .as_ref()
        .and_then(|map| map.get(&id))
        .ok_or_else(|| "Process not found".to_string())?;
    entry
        .lock()
        .map_err(|error| format!("Process lock failed: {error}"))?
        .attached = false;
    Ok(())
}

#[tauri::command]
pub fn attach_process(id: String) -> Result<ProcessInfo, String> {
    let store = processes()
        .lock()
        .map_err(|error| format!("Process store lock failed: {error}"))?;
    let entry = store
        .as_ref()
        .and_then(|map| map.get(&id))
        .ok_or_else(|| "Process not found".to_string())?;
    let mut entry = entry
        .lock()
        .map_err(|error| format!("Process lock failed: {error}"))?;
    entry.attached = true;
    Ok(process_info(id, &entry, true))
}

#[tauri::command]
pub fn list_processes() -> Result<Vec<ProcessInfo>, String> {
    let store = processes()
        .lock()
        .map_err(|error| format!("Process store lock failed: {error}"))?;
    let mut result = Vec::new();
    if let Some(map) = store.as_ref() {
        for (id, entry) in map {
            if let Ok(entry) = entry.lock() {
                result.push(process_info(id.clone(), &entry, false));
            }
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn kill_process(id: String) -> Result<(), String> {
    let mut store = processes()
        .lock()
        .map_err(|error| format!("Process store lock failed: {error}"))?;
    let entry = store
        .as_mut()
        .and_then(|map| map.remove(&id))
        .ok_or_else(|| "Process not found".to_string())?;
    let mut entry = entry
        .into_inner()
        .map_err(|error| format!("Process lock failed: {error}"))?;
    entry
        .child
        .kill()
        .map_err(|error| format!("Failed to kill process: {error}"))
}

#[tauri::command]
pub fn get_scrollback(id: String) -> Result<String, String> {
    let store = processes()
        .lock()
        .map_err(|error| format!("Process store lock failed: {error}"))?;
    let entry = store
        .as_ref()
        .and_then(|map| map.get(&id))
        .ok_or_else(|| "Process not found".to_string())?;
    let scrollback = entry
        .lock()
        .map_err(|error| format!("Process lock failed: {error}"))?
        .scrollback
        .clone();
    Ok(scrollback)
}
