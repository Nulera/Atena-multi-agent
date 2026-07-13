import { Palette } from "lucide-react"
import { useTheme } from "@/lib/theme"

export function ThemeSwitcher() {
  const { theme, themes, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1.5">
      <Palette className="h-3 w-3 text-[hsl(var(--muted))]" />
      <select
        value={theme.id}
        onChange={(e) => setTheme(e.target.value as typeof theme.id)}
        className="h-6 w-full rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel-elevated))] px-1.5 text-[10px] text-[hsl(var(--muted-foreground))] cursor-pointer"
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
