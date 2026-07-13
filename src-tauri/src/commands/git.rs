use serde::Serialize;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub git_available: bool,
    pub is_repo: bool,
    pub branch: String,
    pub modified_files: Vec<GitFile>,
    pub remote_url: String,
    pub user_name: String,
    pub user_email: String,
    pub has_upstream: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFile {
    pub path: String,
    pub status: String,
}

fn run_git(path: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(path)
        .output()
        .map_err(|error| format!("não foi possível executar o Git: {error}"))?;

    if output.status.success() {
        return Ok(String::from_utf8_lossy(&output.stdout).trim().to_string());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let message = if stderr.is_empty() { stdout } else { stderr };
    Err(if message.is_empty() {
        format!("Git encerrou com o código {}", output.status)
    } else {
        message
    })
}

fn read_git(path: &str, args: &[&str]) -> String {
    run_git(path, args).unwrap_or_default()
}

#[tauri::command]
pub fn git_status(path: String) -> Result<GitStatus, String> {
    let git_available = Command::new("git").arg("--version").output().is_ok();
    if !git_available {
        return Ok(GitStatus {
            git_available: false,
            is_repo: false,
            branch: String::new(),
            modified_files: Vec::new(),
            remote_url: String::new(),
            user_name: String::new(),
            user_email: String::new(),
            has_upstream: false,
        });
    }

    let is_repo = run_git(&path, &["rev-parse", "--is-inside-work-tree"])
        .map(|value| value == "true")
        .unwrap_or(false);

    if !is_repo {
        return Ok(GitStatus {
            git_available: true,
            is_repo: false,
            branch: String::new(),
            modified_files: Vec::new(),
            remote_url: String::new(),
            user_name: read_git(&path, &["config", "--get", "user.name"]),
            user_email: read_git(&path, &["config", "--get", "user.email"]),
            has_upstream: false,
        });
    }

    let branch = read_git(&path, &["symbolic-ref", "--short", "HEAD"]);
    let status_output = run_git(&path, &["status", "--porcelain"])?;
    let modified_files = status_output
        .lines()
        .filter(|line| !line.is_empty())
        .map(|line| {
            let status = line.get(0..2).unwrap_or("  ").trim().to_string();
            let path = line.get(3..).unwrap_or("").trim().to_string();
            GitFile { path, status }
        })
        .collect();

    Ok(GitStatus {
        git_available: true,
        is_repo: true,
        branch,
        modified_files,
        remote_url: read_git(&path, &["remote", "get-url", "origin"]),
        user_name: read_git(&path, &["config", "--get", "user.name"]),
        user_email: read_git(&path, &["config", "--get", "user.email"]),
        has_upstream: run_git(
            &path,
            &["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
        )
        .is_ok(),
    })
}

#[tauri::command]
pub fn git_diff(path: String, file: Option<String>) -> Result<String, String> {
    match file {
        Some(file) => run_git(&path, &["diff", "--", &file]),
        None => run_git(&path, &["diff"]),
    }
}

#[tauri::command]
pub fn git_diff_staged(path: String) -> Result<String, String> {
    run_git(&path, &["diff", "--cached"])
}

#[tauri::command]
pub fn git_current_branch(path: String) -> Result<String, String> {
    run_git(&path, &["symbolic-ref", "--short", "HEAD"])
}

#[tauri::command]
pub fn git_init(path: String) -> Result<String, String> {
    run_git(&path, &["init"])
}

#[tauri::command]
pub fn git_set_identity(path: String, name: String, email: String) -> Result<String, String> {
    let name = name.trim();
    let email = email.trim();
    if name.is_empty() || email.is_empty() {
        return Err("informe o nome e o e-mail do Git".to_string());
    }

    run_git(&path, &["config", "user.name", name])?;
    run_git(&path, &["config", "user.email", email])?;
    Ok("identidade Git atualizada".to_string())
}

#[tauri::command]
pub fn git_set_remote(path: String, url: String) -> Result<String, String> {
    let url = url.trim();
    if url.is_empty() {
        return Err("informe a URL do repositório remoto".to_string());
    }

    if run_git(&path, &["remote", "get-url", "origin"]).is_ok() {
        run_git(&path, &["remote", "set-url", "origin", url])?;
    } else {
        run_git(&path, &["remote", "add", "origin", url])?;
    }
    Ok("repositório remoto conectado".to_string())
}

#[tauri::command]
pub fn git_commit_all(path: String, message: String) -> Result<String, String> {
    let message = message.trim();
    if message.is_empty() {
        return Err("informe uma mensagem para o commit".to_string());
    }

    run_git(&path, &["add", "-A"])?;
    run_git(&path, &["commit", "-m", message])
}

#[tauri::command]
pub fn git_pull(path: String) -> Result<String, String> {
    run_git(&path, &["pull", "--ff-only"])
}

#[tauri::command]
pub fn git_push(path: String) -> Result<String, String> {
    run_git(&path, &["push", "-u", "origin", "HEAD"])
}
