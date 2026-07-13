import { invoke } from "@tauri-apps/api/core"

export interface GitStatus {
  gitAvailable: boolean
  isRepo: boolean
  branch: string
  modifiedFiles: GitFile[]
  remoteUrl: string
  userName: string
  userEmail: string
  hasUpstream: boolean
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

export async function gitInit(path: string): Promise<string> {
  return await invoke<string>("git_init", { path })
}

export async function gitSetIdentity(
  path: string,
  name: string,
  email: string
): Promise<string> {
  return await invoke<string>("git_set_identity", { path, name, email })
}

export async function gitSetRemote(path: string, url: string): Promise<string> {
  return await invoke<string>("git_set_remote", { path, url })
}

export async function gitCommitAll(path: string, message: string): Promise<string> {
  return await invoke<string>("git_commit_all", { path, message })
}

export async function gitPull(path: string): Promise<string> {
  return await invoke<string>("git_pull", { path })
}

export async function gitPush(path: string): Promise<string> {
  return await invoke<string>("git_push", { path })
}
