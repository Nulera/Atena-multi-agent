import type { IconType } from "react-icons"
import {
  SiBun,
  SiClaudecode,
  SiGit,
  SiNodedotjs,
  SiNpm,
  SiOpencode,
  SiPnpm,
  SiPython,
  SiRust,
  SiYarn,
} from "react-icons/si"
import { VscTerminal, VscTerminalPowershell } from "react-icons/vsc"
import { TbBrandOpenai } from "react-icons/tb"

export interface CliAppearance {
  label: string
  color: string
  icon: IconType
}

const CLI_APPEARANCES: Array<[string[], CliAppearance]> = [
  [
    ["claude", "claude-code", "claudecode"],
    { label: "Claude", color: "#D97757", icon: SiClaudecode },
  ],
  [
    ["codex", "codex-cli", "openai-codex", "openai"],
    { label: "Codex", color: "#10A37F", icon: TbBrandOpenai },
  ],
  [["opencode"], { label: "OpenCode", color: "#2684FF", icon: SiOpencode }],
  [
    ["powershell", "pwsh"],
    { label: "PowerShell", color: "#3977D5", icon: VscTerminalPowershell },
  ],
  [["npm", "npx"], { label: "npm", color: "#CB3837", icon: SiNpm }],
  [["pnpm"], { label: "pnpm", color: "#E99A00", icon: SiPnpm }],
  [["yarn"], { label: "Yarn", color: "#2C8EBB", icon: SiYarn }],
  [["bun"], { label: "Bun", color: "#E85D75", icon: SiBun }],
  [["node"], { label: "Node", color: "#4F8F44", icon: SiNodedotjs }],
  [
    ["python", "python3", "py"],
    { label: "Python", color: "#3776AB", icon: SiPython },
  ],
  [["git", "gh"], { label: "Git", color: "#F05032", icon: SiGit }],
  [["cargo", "rustc"], { label: "Rust", color: "#CE422B", icon: SiRust }],
]

export function getCliAppearance(cli: string): CliAppearance {
  const normalized = cli.trim().toLowerCase()
  const match = CLI_APPEARANCES.find(([aliases]) =>
    aliases.some(
      (alias) =>
        normalized === alias ||
        normalized.startsWith(`${alias}-`) ||
        normalized.startsWith(`${alias}.`)
    )
  )
  if (match) return match[1]
  return {
    label: cli.trim() || "Shell",
    color: "#8B949E",
    icon: VscTerminal,
  }
}
