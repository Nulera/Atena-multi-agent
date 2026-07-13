import { useState, useEffect, useCallback, useRef } from "react"
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
      setTimeout(() => inputRef.current?.focus(), 30)
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
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      onClick={() => onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-md rounded-[var(--radius-sm)] border border-[hsl(var(--border-strong))] bg-[hsl(var(--panel))] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-3 py-2">
          <span className="text-[hsl(var(--accent))] text-xs">$</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="type a command..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted))]"
          />
          <kbd className="text-[9px] text-[hsl(var(--muted))]">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[260px] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="p-3 text-center text-[11px] text-[hsl(var(--muted))]">
              no results
            </p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                className={cn(
                  "flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors cursor-pointer",
                  i === activeIndex
                    ? "bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--panel-elevated))]"
                )}
                onClick={() => executeCommand(cmd)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {cmd.icon && (
                  <span className="shrink-0 opacity-70">{cmd.icon}</span>
                )}
                <span className="min-w-0 flex-1 truncate text-xs">
                  {cmd.label}
                </span>
                {cmd.shortcut && (
                  <kbd className="shrink-0 text-[9px] text-[hsl(var(--muted))]">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
