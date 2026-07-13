use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio, Child};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub id: String,
    pub agent_id: Option<String>,
    pub command: String,
    pub working_dir: String,
    pub pid: Option<u32>,
    pub running: bool,
}

struct ProcessEntry {
    child: Child,
    stdin: Option<std::process::ChildStdin>,
}

static PROCESSES: Mutex<Option<HashMap<String, Mutex<ProcessEntry>>>> = Mutex::new(None);

fn get_processes() -> &'static Mutex<Option<HashMap<String, Mutex<ProcessEntry>>>> {
    &PROCESSES
}

#[tauri::command]
pub fn spawn_process(
    app: AppHandle,
    command: String,
    working_dir: String,
    agent_id: Option<String>,
) -> Result<ProcessInfo, String> {
    let id = Uuid::new_v4().to_string();

    let shell = if cfg!(target_os = "windows") {
        "cmd"
    } else {
        "sh"
    };

    let args = if cfg!(target_os = "windows") {
        vec!["/C", &command]
    } else {
        vec!["-c", &command]
    };

    let mut cmd = Command::new(shell);
    cmd.args(&args)
        .current_dir(&working_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    let pid = child.id();

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let stdin = child.stdin.take();

    let event_id = id.clone();

    if let Some(stdout) = stdout {
        let app_clone = app.clone();
        let eid = event_id.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(text) => {
                        let _ = app_clone.emit(
                            &format!("pty:{}:output", eid),
                            text + "\n",
                        );
                    }
                    Err(_) => break,
                }
            }
            let _ = app_clone.emit(&format!("pty:{}:exit", eid), ());
        });
    }

    if let Some(stderr) = stderr {
        let app_clone = app.clone();
        let eid = event_id.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                match line {
                    Ok(text) => {
                        let _ = app_clone.emit(
                            &format!("pty:{}:output", eid),
                            text + "\n",
                        );
                    }
                    Err(_) => break,
                }
            }
        });
    }

    let entry = ProcessEntry { child, stdin };

    let mut procs = get_processes()
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    if procs.is_none() {
        *procs = Some(HashMap::new());
    }
    if let Some(map) = procs.as_mut() {
        map.insert(id.clone(), Mutex::new(entry));
    }

    Ok(ProcessInfo {
        id,
        agent_id,
        command,
        working_dir,
        pid: Some(pid),
        running: true,
    })
}

#[tauri::command]
pub fn write_to_process(id: String, data: String) -> Result<(), String> {
    let procs = get_processes()
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if let Some(map) = procs.as_ref() {
        if let Some(entry_mutex) = map.get(&id) {
            let mut entry = entry_mutex
                .lock()
                .map_err(|e| format!("Lock error: {}", e))?;
            if let Some(stdin) = entry.stdin.as_mut() {
                stdin
                    .write_all(data.as_bytes())
                    .map_err(|e| format!("Write error: {}", e))?;
                stdin
                    .flush()
                    .map_err(|e| format!("Flush error: {}", e))?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn kill_process(id: String) -> Result<(), String> {
    let procs = get_processes()
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if let Some(map) = procs.as_ref() {
        if let Some(entry_mutex) = map.get(&id) {
            let mut entry = entry_mutex
                .lock()
                .map_err(|e| format!("Lock error: {}", e))?;
            entry
                .child
                .kill()
                .map_err(|e| format!("Kill error: {}", e))?;
        }
    }

    let mut procs = get_processes()
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    if let Some(map) = procs.as_mut() {
        map.remove(&id);
    }

    Ok(())
}

#[tauri::command]
pub fn list_processes() -> Result<Vec<String>, String> {
    let procs = get_processes()
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    Ok(procs
        .as_ref()
        .map(|m| m.keys().cloned().collect())
        .unwrap_or_default())
}
