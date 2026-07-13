import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  defaultTheme,
  themes,
  type Theme,
  type ThemeIdExtended,
} from "./theme-registry"

interface ThemeContextValue {
  theme: Theme
  themeId: ThemeIdExtended
  setTheme: (id: ThemeIdExtended) => void
  themes: Theme[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "atena.theme"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeIdExtended>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeIdExtended | null
      if (stored && themes.some((t) => t.id === stored)) {
        return stored
      }
    }
    return defaultTheme
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeId)
    localStorage.setItem(STORAGE_KEY, themeId)
  }, [themeId])

  const setTheme = useCallback((id: ThemeIdExtended) => {
    setThemeId(id)
  }, [])

  const value = useMemo<ThemeContextValue>(() => {
    const theme = themes.find((t) => t.id === themeId) ?? themes[0]
    return { theme, themeId, setTheme, themes }
  }, [themeId, setTheme])

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider")
  }
  return ctx
}
