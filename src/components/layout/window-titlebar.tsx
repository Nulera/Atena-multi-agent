import { useCallback } from "react"
import { Minus, Square, X } from "lucide-react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import atenaMark from "@/assets/atena-mark.svg"

const appWindow = getCurrentWindow()

export function WindowTitlebar() {
  const minimize = useCallback(() => {
    void appWindow.minimize()
  }, [])

  const toggleMaximize = useCallback(() => {
    void appWindow.toggleMaximize()
  }, [])

  const close = useCallback(() => {
    void appWindow.close()
  }, [])

  return (
    <header
      data-tauri-drag-region
      className="relative flex h-8 shrink-0 select-none items-center border-b border-[hsl(var(--border))] bg-[hsl(var(--panel))]"
      onDoubleClick={toggleMaximize}
    >
      <div
        data-tauri-drag-region
        className="flex min-w-0 flex-1 items-center gap-2 px-2.5"
      >
        <img
          src={atenaMark}
          alt=""
          className="pointer-events-none h-4 w-4 rounded-[4px]"
        />
        <span className="pointer-events-none text-[9px] font-semibold tracking-[0.2em] text-[hsl(var(--foreground))]">
          ATENA
        </span>
        <span className="pointer-events-none h-3 w-px bg-[hsl(var(--border-strong))]" />
        <span className="pointer-events-none truncate text-[8px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
          local command surface
        </span>
      </div>

      <div
        className="flex h-full shrink-0"
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="flex h-full w-11 items-center justify-center text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--panel-elevated))] hover:text-[hsl(var(--foreground))]"
          onClick={minimize}
          aria-label="Minimizar"
          title="Minimizar"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="flex h-full w-11 items-center justify-center text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--panel-elevated))] hover:text-[hsl(var(--foreground))]"
          onClick={toggleMaximize}
          aria-label="Maximizar ou restaurar"
          title="Maximizar ou restaurar"
        >
          <Square className="h-3 w-3" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="flex h-full w-11 items-center justify-center text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--danger))] hover:text-white"
          onClick={close}
          aria-label="Fechar"
          title="Fechar"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  )
}
