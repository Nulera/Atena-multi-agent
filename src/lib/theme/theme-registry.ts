export type ThemeIdExtended =
  | "terminal-dark"
  | "dracula"
  | "nord"
  | "gruvbox"
  | "tokyo-night"
  | "graphite"
  | "midnight-blue"
  | "synthwave"
  | "light-minimal"

export interface Theme {
  id: ThemeIdExtended
  name: string
  description: string
  isDark: boolean
}

export const themes: Theme[] = [
  { id: "terminal-dark", name: "Terminal Dark", description: "Quase preto, acento verde", isDark: true },
  { id: "dracula", name: "Dracula", description: "Roxo escuro, acentos rosa", isDark: true },
  { id: "nord", name: "Nord", description: "Azul frio, acento azul claro", isDark: true },
  { id: "gruvbox", name: "Gruvbox", description: "Terra quente, acento ciano", isDark: true },
  { id: "tokyo-night", name: "Tokyo Night", description: "Azul profundo, acento ciano", isDark: true },
  { id: "graphite", name: "Graphite", description: "Cinzas neutros", isDark: true },
  { id: "midnight-blue", name: "Midnight Blue", description: "Azul escuro tech", isDark: true },
  { id: "synthwave", name: "Synthwave", description: "Roxo/rosa glow", isDark: true },
  { id: "light-minimal", name: "Light Minimal", description: "Claro minimalista", isDark: false },
]

export const defaultTheme: ThemeIdExtended = "terminal-dark"
