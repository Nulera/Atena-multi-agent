import { invoke } from "@tauri-apps/api/core"
import { normalizeAppError } from "@/lib/errors"

type CommandExecutor = (
  command: string,
  args?: Record<string, unknown>
) => Promise<unknown>

export type CommandGateway = <T>(
  command: string,
  args: Record<string, unknown> | undefined,
  operation: string
) => Promise<T>

const tauriExecutor: CommandExecutor = (command, args) =>
  invoke(command, args)

export function createCommandGateway(
  execute: CommandExecutor = tauriExecutor
): CommandGateway {
  return async function commandGateway<T>(
    command: string,
    args: Record<string, unknown> | undefined,
    operation: string
  ): Promise<T> {
    try {
      return (await execute(command, args)) as T
    } catch (error) {
      throw normalizeAppError(error, operation)
    }
  }
}

export const invokeCommand = createCommandGateway()
