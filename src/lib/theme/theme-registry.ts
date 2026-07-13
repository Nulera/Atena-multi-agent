export type ThemeId =
  | "terminal-dark"
  | "graphite"
  | "midnight-blue"
  | "synthwave"
  | "light-minimal"

export interface Theme {
  id: ThemeId
  name: string
  description: string
  isDark: boolean
}

export const themes: Theme[] = [
  {
    id: "terminal-dark",
    name: "Terminal Dark",
    description: "Visual escuro, técnico e elegante. Padrão.",
    isDark: true,
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Cinzas profundos, neutro e premium.",
    isDark: true,
  },
  {
    id: "midnight-blue",
    name: "Midnight Blue",
    description: "Azul escuro com acentos vivos. Identidade tech.",
    isDark: true,
  },
  {
    id: "synthwave",
    name: "Synthwave",
    description: "Roxo/rosa/ciano com glow controlado.",
    isDark: true,
  },
  {
    id: "light-minimal",
    name: "Light Minimal",
    description: "Fundo claro, bordas suaves. Foco em produtividade.",
    isDark: false,
  },
]

export const defaultTheme: ThemeId = "terminal-dark"
