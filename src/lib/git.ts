import { invokeCommand } from "@/lib/tauri-command"

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
  return await invokeCommand<GitStatus>("git_status", { path }, "git.status")
}

export async function gitDiff(path: string, file?: string): Promise<string> {
  return await invokeCommand<string>(
    "git_diff",
    { path, file: file ?? null },
    "git.diff"
  )
}

export async function gitDiffStaged(path: string): Promise<string> {
  return await invokeCommand<string>(
    "git_diff_staged",
    { path },
    "git.diffStaged"
  )
}

export async function gitCurrentBranch(path: string): Promise<string> {
  return await invokeCommand<string>(
    "git_current_branch",
    { path },
    "git.currentBranch"
  )
}

export async function gitInit(path: string): Promise<string> {
  return await invokeCommand<string>("git_init", { path }, "git.init")
}

export async function gitSetIdentity(
  path: string,
  name: string,
  email: string
): Promise<string> {
  return await invokeCommand<string>(
    "git_set_identity",
    { path, name, email },
    "git.setIdentity"
  )
}

export async function gitSetRemote(path: string, url: string): Promise<string> {
  return await invokeCommand<string>(
    "git_set_remote",
    { path, url },
    "git.setRemote"
  )
}

export async function gitCommitAll(
  path: string,
  message: string
): Promise<string> {
  return await invokeCommand<string>(
    "git_commit_all",
    { path, message },
    "git.commitAll"
  )
}

export async function gitPull(path: string): Promise<string> {
  return await invokeCommand<string>("git_pull", { path }, "git.pull")
}

export async function gitPush(path: string): Promise<string> {
  return await invokeCommand<string>("git_push", { path }, "git.push")
}
