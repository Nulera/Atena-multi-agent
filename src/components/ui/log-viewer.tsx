import { cn } from "@/lib/utils"

interface LogEntry {
  type: "command" | "output" | "error" | "info"
  content: string
  timestamp: string
}

interface LogViewerProps {
  logs: LogEntry[]
  className?: string
}

const typeColors: Record<LogEntry["type"], string> = {
  command: "text-[hsl(var(--accent))]",
  output: "text-[hsl(var(--foreground))]",
  error: "text-[hsl(var(--danger))]",
  info: "text-[hsl(var(--muted-foreground))]",
}

const typePrefix: Record<LogEntry["type"], string> = {
  command: "$",
  output: "",
  error: "!",
  info: "→",
}

export function LogViewer({ logs, className }: LogViewerProps) {
  return (
    <div
      className={cn(
        "h-full overflow-y-auto rounded-[var(--radius-sm)] bg-[hsl(var(--background))] p-3 font-mono text-xs",
        className
      )}
    >
      {logs.length === 0 ? (
        <p className="text-[hsl(var(--muted-foreground))]">Sem logs.</p>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="flex gap-2 leading-relaxed">
            <span className="shrink-0 text-[hsl(var(--muted))]">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            {typePrefix[log.type] && (
              <span className={cn("shrink-0", typeColors[log.type])}>
                {typePrefix[log.type]}
              </span>
            )}
            <span className={cn("whitespace-pre-wrap break-all", typeColors[log.type])}>
              {log.content}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
