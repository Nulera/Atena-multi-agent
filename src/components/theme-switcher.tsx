import { Palette } from "lucide-react"
import { useTheme } from "@/lib/theme"

export function ThemeSwitcher() {
  const { theme, themes, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-2">
      <Palette className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
      <select
        value={theme.id}
        onChange={(e) => setTheme(e.target.value as typeof theme.id)}
        className="h-8 rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel-elevated))] px-2 text-xs text-[hsl(var(--foreground))] cursor-pointer"
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
