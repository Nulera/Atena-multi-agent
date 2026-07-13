import { invoke } from "@tauri-apps/api/core"

export interface GitStatus {
  isRepo: boolean
  branch: string
  modifiedFiles: GitFile[]
}

export interface GitFile {
  path: string
  status: string
}

export async function gitStatus(path: string): Promise<GitStatus> {
  return await invoke<GitStatus>("git_status", { path })
}

export async function gitDiff(path: string, file?: string): Promise<string> {
  return await invoke<string>("git_diff", { path, file: file ?? null })
}

export async function gitDiffStaged(path: string): Promise<string> {
  return await invoke<string>("git_diff_staged", { path })
}

export async function gitCurrentBranch(path: string): Promise<string> {
  return await invoke<string>("git_current_branch", { path })
}
