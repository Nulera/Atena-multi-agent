import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { invokeCommand } from "@/lib/tauri-command"

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
  return await invokeCommand<ProcessInfo>(
    "spawn_process",
    { command, workingDir, agentId: agentId ?? null },
    "pty.spawn"
  )
}

export async function writeToProcess(id: string, data: string): Promise<void> {
  await invokeCommand("write_to_process", { id, data }, "pty.write")
}

export async function resizeProcess(
  id: string,
  rows: number,
  cols: number
): Promise<void> {
  await invokeCommand("resize_process", { id, rows, cols }, "pty.resize")
}

export async function killProcess(id: string): Promise<void> {
  await invokeCommand("kill_process", { id }, "pty.kill")
}

export async function detachProcess(id: string): Promise<void> {
  await invokeCommand("detach_process", { id }, "pty.detach")
}

export async function attachProcess(id: string): Promise<ProcessInfo> {
  return await invokeCommand<ProcessInfo>(
    "attach_process",
    { id },
    "pty.attach"
  )
}

export async function listProcesses(): Promise<ProcessInfo[]> {
  return await invokeCommand<ProcessInfo[]>(
    "list_processes",
    undefined,
    "pty.list"
  )
}

export async function getScrollback(id: string): Promise<string> {
  return await invokeCommand<string>(
    "get_scrollback",
    { id },
    "pty.scrollback"
  )
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
