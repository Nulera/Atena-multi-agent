import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

export interface ProcessInfo {
  id: string
  agentId: string | null
  command: string
  workingDir: string
  pid: number | null
  running: boolean
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

export async function killProcess(id: string): Promise<void> {
  await invoke("kill_process", { id })
}

export async function listProcesses(): Promise<string[]> {
  return await invoke<string[]>("list_processes")
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
