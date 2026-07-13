import { useState, useEffect, useCallback, useRef } from "react"
import { Search, CornerDownLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: CommandItem[]
}

export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (open) {
      setSearch("")
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [search])

  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      cmd.action()
      onOpenChange(false)
    },
    [onOpenChange]
  )

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (filtered[activeIndex]) {
          executeCommand(filtered[activeIndex])
        }
      } else if (e.key === "Escape") {
        onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, filtered, activeIndex, executeCommand, onOpenChange])

  useEffect(() => {
    if (open) {
      const el = listRef.current?.children[activeIndex] as HTMLElement
      el?.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh]"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative w-full max-w-xl rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] p-3">
          <Search className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite um comando..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
          />
          <kbd className="rounded border border-[hsl(var(--border))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[300px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Nenhum comando encontrado
            </p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left transition-colors cursor-pointer",
                  i === activeIndex
                    ? "bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--panel-elevated))]"
                )}
                onClick={() => executeCommand(cmd)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {cmd.icon && (
                  <span className="shrink-0">{cmd.icon}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{cmd.label}</p>
                  {cmd.description && (
                    <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                      {cmd.description}
                    </p>
                  )}
                </div>
                {cmd.shortcut && (
                  <kbd className="shrink-0 rounded border border-[hsl(var(--border))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {cmd.shortcut}
                  </kbd>
                )}
                {i === activeIndex && (
                  <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
