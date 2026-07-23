import { invokeCommand } from "@/lib/tauri-command"

export async function ping(): Promise<string> {
  return await invokeCommand<string>("ping", undefined, "app.ping")
}
