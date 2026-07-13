use std::process::Command;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: String,
    pub modified_files: Vec<GitFile>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitFile {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitDiffResult {
    pub files: Vec<GitDiffFile>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitDiffFile {
    pub path: String,
    pub diff: String,
}

#[tauri::command]
pub fn git_status(path: String) -> Result<GitStatus, String> {
    let is_repo = Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(&path)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !is_repo {
        return Ok(GitStatus {
            is_repo: false,
            branch: String::new(),
            modified_files: Vec::new(),
        });
    }

    let branch = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(&path)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .map_err(|e| e.to_string())?;

    let status_output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    let status_str = String::from_utf8_lossy(&status_output.stdout);
    let modified_files: Vec<GitFile> = status_str
        .lines()
        .filter(|l| !l.is_empty())
        .map(|l| {
            let status = l.get(0..2).unwrap_or("  ").trim().to_string();
            let file_path = l.get(3..).unwrap_or("").trim().to_string();
            GitFile {
                path: file_path,
                status,
            }
        })
        .collect();

    Ok(GitStatus {
        is_repo: true,
        branch,
        modified_files,
    })
}

#[tauri::command]
pub fn git_diff(path: String, file: Option<String>) -> Result<String, String> {
    let mut args = vec!["diff"];
    if let Some(ref f) = file {
        args.push("--");
        args.push(f);
    }

    let output = Command::new("git")
        .args(&args)
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn git_diff_staged(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["diff", "--cached"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn git_current_branch(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
