export const destructiveCommands: string[] = [
  "rm -rf",
  "rm -fr",
  "git reset --hard",
  "git clean -fd",
  "git clean -f",
  "sudo",
  "del /f /s /q",
  "rmdir /s /q",
  "format",
  "shutdown",
  "del /f",
  "rd /s /q",
]

export function isDestructiveCommand(command: string): boolean {
  const lower = command.toLowerCase().trim()
  return destructiveCommands.some((dc) => lower.includes(dc.toLowerCase()))
}

export interface CommandCheckResult {
  isDestructive: boolean
  matchedPattern?: string
}

export function checkCommand(command: string): CommandCheckResult {
  const lower = command.toLowerCase().trim()
  for (const dc of destructiveCommands) {
    if (lower.includes(dc.toLowerCase())) {
      return { isDestructive: true, matchedPattern: dc }
    }
  }
  return { isDestructive: false }
}
