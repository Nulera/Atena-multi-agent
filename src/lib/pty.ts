import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

export interface ProcessInfo {
  id: string
  agentId: string | null
  command: string
  workingDir: string
  pid: number | null
  running: boolean
  attached: boolean
  scrollback: string
}

export async function spawnProcess(
  command: string,
  workingDir: string,
  agentId?: string
): Promise<ProcessInfo> {
  return await invoke<ProcessInfo>("spawn_process", {
    command,
    workingDir,
    agentId: agentId ?? null,
  })
}

export async function writeToProcess(id: string, data: string): Promise<void> {
  await invoke("write_to_process", { id, data })
}

export async function resizeProcess(
  id: string,
  rows: number,
  cols: number
): Promise<void> {
  await invoke("resize_process", { id, rows, cols })
}

export async function killProcess(id: string): Promise<void> {
  await invoke("kill_process", { id })
}

export async function detachProcess(id: string): Promise<void> {
  await invoke("detach_process", { id })
}

export async function attachProcess(id: string): Promise<ProcessInfo> {
  return await invoke<ProcessInfo>("attach_process", { id })
}

export async function listProcesses(): Promise<ProcessInfo[]> {
  return await invoke<ProcessInfo[]>("list_processes")
}

export async function getScrollback(id: string): Promise<string> {
  return await invoke<string>("get_scrollback", { id })
}

export function onProcessOutput(
  processId: string,
  callback: (data: string) => void
): Promise<UnlistenFn> {
  return listen<string>(`pty:${processId}:output`, (event) => {
    callback(event.payload)
  })
}

export function onProcessExit(
  processId: string,
  callback: () => void
): Promise<UnlistenFn> {
  return listen(`pty:${processId}:exit`, () => {
    callback()
  })
}
