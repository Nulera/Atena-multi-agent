import { useEffect, useRef, useCallback } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "@xterm/xterm/css/xterm.css"
import {
  spawnProcess,
  writeToProcess,
  killProcess,
  onProcessOutput,
  onProcessExit,
} from "@/lib/pty"
import { createSession, updateSession, addSessionLog } from "@/lib/db"
import { useTheme } from "@/lib/theme"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Square,
  Trash2,
  Copy,
  Terminal as TerminalIcon,
} from "lucide-react"

interface TerminalViewProps {
  agentId?: string
  agentName: string
  command?: string
  workingDir: string
  workspaceId?: string
  onLog?: (type: string, content: string) => void
}

export function TerminalView({
  agentId,
  agentName,
  command,
  workingDir,
  workspaceId,
  onLog,
}: TerminalViewProps) {
  const termRef = useRef<HTMLDivElement>(null)
  const termInstanceRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const processIdRef = useRef<string | null>(null)
  const { theme } = useTheme()

  const getTerminalTheme = useCallback(() => {
    const isDark = theme.isDark
    if (isDark) {
      return {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#58a6ff",
        selectionBackground: "#264f78",
        black: "#0d1117",
        red: "#f85149",
        green: "#3fb950",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39c5cf",
        white: "#c9d1d9",
        brightBlack: "#6e7681",
        brightRed: "#ff7b72",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#79c0ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#56d4dd",
        brightWhite: "#f0f6fc",
      }
    }
    return {
      background: "#ffffff",
      foreground: "#24292f",
      cursor: "#0969da",
      selectionBackground: "#ddf4ff",
      black: "#24292f",
      red: "#cf222e",
      green: "#116329",
      yellow: "#4d2d00",
      blue: "#0969da",
      magenta: "#8250df",
      cyan: "#1b7c83",
      white: "#6e7781",
      brightBlack: "#57606a",
      brightRed: "#a40e26",
      brightGreen: "#1a7f37",
      brightYellow: "#633c01",
      brightBlue: "#218bff",
      brightMagenta: "#a475f9",
      brightCyan: "#3192aa",
      brightWhite: "#8c959f",
    }
  }, [theme])

  const initTerminal = useCallback(() => {
    if (!termRef.current || termInstanceRef.current) return

    const term = new Terminal({
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
      cursorBlink: true,
      theme: getTerminalTheme() as any,
      allowProposedApi: true,
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())

    term.open(termRef.current)
    fit.fit()

    termInstanceRef.current = term
    fitRef.current = fit

    term.onData((data) => {
      if (processIdRef.current) {
        writeToProcess(processIdRef.current, data)
        onLog?.("command", data)
      }
    })

    term.write(`\x1b[36m${agentName}\x1b[0m\r\n`)
    term.write(`\x1b[90mDir: ${workingDir}\x1b[0m\r\n`)
    if (command) {
      term.write(`\x1b[90mCmd: ${command}\x1b[0m\r\n`)
    }
    term.write("\r\n")
  }, [agentName, workingDir, command, getTerminalTheme, onLog])

  const startProcess = useCallback(async () => {
    if (!command || processIdRef.current) return

    const term = termInstanceRef.current
    if (!term) return

    term.write(`\x1b[33mIniciando: ${command}\x1b[0m\r\n\r\n`)

    let sessionId: string | null = null
    if (workspaceId && agentId) {
      try {
        const session = await createSession(
          workspaceId,
          agentId,
          `${agentName} — ${new Date().toLocaleString()}`
        )
        sessionId = session.id
        await addSessionLog(sessionId, "info", `Command: ${command}`)
      } catch (err) {
        console.error("Failed to create session:", err)
      }
    }

    try {
      const info = await spawnProcess(command, workingDir, agentId)
      processIdRef.current = info.id

      const unlistenOutput = await onProcessOutput(info.id, (data) => {
        term.write(data)
        onLog?.("output", data)
        if (sessionId) {
          addSessionLog(sessionId, "output", data).catch(() => {})
        }
      })

      const unlistenExit = await onProcessExit(info.id, () => {
        term.write(`\r\n\x1b[31m[Processo encerrado]\x1b[0m\r\n`)
        processIdRef.current = null
        unlistenOutput()
        unlistenExit()
        if (sessionId) {
          updateSession(sessionId, { status: "finished" }).catch(() => {})
          addSessionLog(sessionId, "info", "Process finished").catch(() => {})
        }
      })
    } catch (err) {
      term.write(`\x1b[31mErro: ${err}\x1b[0m\r\n`)
      onLog?.("error", String(err))
      if (sessionId) {
        addSessionLog(sessionId, "error", String(err)).catch(() => {})
        updateSession(sessionId, { status: "error" }).catch(() => {})
      }
    }
  }, [command, workingDir, agentId, workspaceId, agentName, onLog])

  const stopProcess = useCallback(async () => {
    if (processIdRef.current) {
      await killProcess(processIdRef.current)
      processIdRef.current = null
      termInstanceRef.current?.write(`\r\n\x1b[33m[Processo encerrado pelo usuário]\x1b[0m\r\n`)
    }
  }, [])

  const clearTerminal = useCallback(() => {
    termInstanceRef.current?.clear()
  }, [])

  const copyLogs = useCallback(() => {
    const term = termInstanceRef.current
    if (term) {
      const selection = term.getSelection()
      if (selection) {
        navigator.clipboard.writeText(selection)
      }
    }
  }, [])

  useEffect(() => {
    initTerminal()
    return () => {
      if (processIdRef.current) {
        killProcess(processIdRef.current)
      }
      termInstanceRef.current?.dispose()
      termInstanceRef.current = null
    }
  }, [initTerminal])

  useEffect(() => {
    if (termInstanceRef.current) {
      termInstanceRef.current.options.theme = getTerminalTheme() as any
    }
  }, [theme, getTerminalTheme])

  useEffect(() => {
    const handleResize = () => fitRef.current?.fit()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="flex h-full flex-col rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] overflow-hidden">
      <div className="flex h-9 items-center gap-2 border-b border-[hsl(var(--border))] px-3">
        <TerminalIcon className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
        <span className="text-xs font-medium">{agentName}</span>
        <Badge
          variant={processIdRef.current ? "accent" : "muted"}
          className="ml-1"
        >
          {processIdRef.current ? "Running" : "Idle"}
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={startProcess}
            disabled={!command || !!processIdRef.current}
            title="Iniciar"
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={stopProcess}
            disabled={!processIdRef.current}
            title="Encerrar"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={copyLogs}
            title="Copiar"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearTerminal}
            title="Limpar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div ref={termRef} className="flex-1 overflow-hidden p-1" />
    </div>
  )
}
