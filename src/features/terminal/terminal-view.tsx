import { useEffect, useRef, useCallback, useState, type ReactNode } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "@xterm/xterm/css/xterm.css"
import {
  spawnProcess,
  writeToProcess,
  resizeProcess,
  killProcess,
  attachProcess,
  onProcessOutput,
  onProcessExit,
} from "@/lib/pty"
import { detectCli, stripAnsi } from "@/features/terminal/terminal-domain"
import { createSession, updateSession, addSessionLog } from "@/lib/db"
import { useTheme } from "@/lib/theme"
import { Button } from "@/components/ui/button"
import {
  Square,
  Trash2,
  Copy,
  RotateCw,
  Terminal as TerminalIcon,
  X,
} from "lucide-react"

interface TerminalViewProps {
  agentId?: string
  agentName: string
  command?: string
  workingDir: string
  workspaceId?: string
  onClose?: () => void
  onActivityChange?: (activity: TerminalActivity) => void
  accentColor?: string
  cliIcon?: ReactNode
}

export type TerminalStatus = "open" | "idle" | "running" | "stopped"

export interface TerminalActivity {
  status: TerminalStatus
  cli: string
  resumeCommand?: string
}

export function TerminalView({
  agentId,
  agentName,
  command,
  workingDir,
  workspaceId,
  onClose,
  onActivityChange,
  accentColor = "#8B949E",
  cliIcon,
}: TerminalViewProps) {
  const termRef = useRef<HTMLDivElement>(null)
  const termInstanceRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const processIdRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const unlistenRef = useRef<Array<() => void>>([])
  const dataDisposableRef = useRef<{ dispose: () => void } | null>(null)
  const disposedRef = useRef(false)
  const inputBufferRef = useRef("")
  const pendingInputRef = useRef("")
  const outputTailRef = useRef("")
  const currentCliRef = useRef("PowerShell")
  const currentStatusRef = useRef<TerminalStatus>("open")
  const resumeCommandRef = useRef("")
  const inputEscapeStateRef = useRef<"none" | "escape" | "csi" | "osc">("none")
  const [isRunning, setIsRunning] = useState(false)
  const { theme } = useTheme()

  const focusTerminal = useCallback(() => {
    requestAnimationFrame(() => {
      if (!disposedRef.current) {
        termInstanceRef.current?.focus()
      }
    })
  }, [])

  const reportActivity = useCallback(
    (
      status: TerminalStatus,
      cli = currentCliRef.current,
      resumeCommand = resumeCommandRef.current
    ) => {
      currentStatusRef.current = status
      currentCliRef.current = cli
      resumeCommandRef.current = resumeCommand
      onActivityChange?.({ status, cli, resumeCommand })
    },
    [onActivityChange]
  )

  const getTerminalTheme = useCallback(() => {
    if (theme.isDark) {
      return {
        background: "#0a0a0a",
        foreground: "#e0e0e0",
        cursor: "#39c5cf",
        selectionBackground: "#264f78",
        black: "#0a0a0a",
        red: "#f85149",
        green: "#39c5cf",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39c5cf",
        white: "#e0e0e0",
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

  const startShell = useCallback(async () => {
    if (processIdRef.current) return
    const term = termInstanceRef.current
    if (!term || disposedRef.current) return

    // Create session for logging
    if (workspaceId && agentId) {
      try {
        const session = await createSession(
          workspaceId,
          agentId,
          `${agentName} — ${new Date().toLocaleString()}`
        )
        sessionIdRef.current = session.id
      } catch (err) {
        console.error("Failed to create session:", err)
      }
    }

    try {
      const initialCli = command?.trim() ? detectCli(command) : "PowerShell"
      const initialResumeCommand = /^(claude|codex|opencode)$/i.test(initialCli)
        ? command?.trim() || initialCli.toLowerCase()
        : ""
      reportActivity(
        command?.trim() ? "running" : "open",
        initialCli,
        initialResumeCommand
      )
      // Always spawn an interactive shell; if command is set, it gets sent to the shell
      const info = await spawnProcess(command || "", workingDir, agentId)
      if (disposedRef.current || termInstanceRef.current !== term) {
        killProcess(info.id).catch(() => {})
        return
      }
      processIdRef.current = info.id
      setIsRunning(true)
      focusTerminal()
      resizeProcess(info.id, term.rows, term.cols).catch(() => {})

      if (pendingInputRef.current) {
        const pendingInput = pendingInputRef.current
        pendingInputRef.current = ""
        writeToProcess(info.id, pendingInput).catch((err) => {
          console.error("Failed to flush pending PTY input:", err)
        })
      }

      if (sessionIdRef.current) {
        addSessionLog(
          sessionIdRef.current,
          "info",
          command ? `$ ${command}` : "$ shell"
        ).catch(() => {})
      }

      const unlistenOutput = await onProcessOutput(info.id, (data) => {
        if (disposedRef.current) return
        term.write(data)
        const plainOutput = stripAnsi(data)
        outputTailRef.current = `${outputTailRef.current}${plainOutput}`.slice(
          -500
        )
        const hasKnownInteractiveCli = /^(claude|codex|opencode)$/i.test(
          currentCliRef.current
        )
        if (!hasKnownInteractiveCli) {
          if (/claude\s+code/i.test(outputTailRef.current)) {
            reportActivity("running", "claude")
          } else if (
            /(?:openai\s+codex|codex\s+cli)/i.test(outputTailRef.current)
          ) {
            reportActivity("running", "codex")
          } else if (/\bopencode\b/i.test(outputTailRef.current)) {
            reportActivity("running", "opencode")
          }
        }
        if (/(?:^|[\r\n])PS [^\r\n>]*>\s*$/.test(outputTailRef.current)) {
          inputBufferRef.current = ""
          reportActivity("idle", "PowerShell")
        }
        if (sessionIdRef.current) {
          addSessionLog(sessionIdRef.current, "output", data).catch(() => {})
        }
      })

      const unlistenExit = await onProcessExit(info.id, () => {
        if (disposedRef.current) return
        term.write("\r\n\x1b[31m[exit]\x1b[0m\r\n")
        processIdRef.current = null
        setIsRunning(false)
        reportActivity("stopped")
        if (sessionIdRef.current) {
          updateSession(sessionIdRef.current, { status: "finished" }).catch(
            () => {}
          )
        }
      })

      unlistenRef.current = [unlistenOutput, unlistenExit]

      const attached = await attachProcess(info.id)
      if (disposedRef.current || termInstanceRef.current !== term) return
      if (attached.scrollback) {
        term.write(attached.scrollback)
        const plainScrollback = stripAnsi(attached.scrollback)
        outputTailRef.current = plainScrollback.slice(-500)
        if (/claude\s+code/i.test(outputTailRef.current)) {
          reportActivity("running", "claude")
        } else if (
          /(?:openai\s+codex|codex\s+cli)/i.test(outputTailRef.current)
        ) {
          reportActivity("running", "codex")
        } else if (/\bopencode\b/i.test(outputTailRef.current)) {
          reportActivity("running", "opencode")
        }
        if (/(?:^|[\r\n])PS [^\r\n>]*>\s*$/.test(outputTailRef.current)) {
          reportActivity("idle", "PowerShell")
        }
      }
    } catch (err) {
      if (!disposedRef.current) {
        term.write(`\x1b[31merr: ${err}\x1b[0m\r\n`)
        reportActivity("stopped")
      }
      if (sessionIdRef.current) {
        addSessionLog(sessionIdRef.current, "error", String(err)).catch(
          () => {}
        )
        updateSession(sessionIdRef.current, { status: "error" }).catch(() => {})
      }
    }
  }, [
    command,
    workingDir,
    agentId,
    workspaceId,
    agentName,
    focusTerminal,
    reportActivity,
  ])

  // Initialize terminal + auto-start shell
  useEffect(() => {
    if (!termRef.current || termInstanceRef.current) return
    disposedRef.current = false

    const term = new Terminal({
      fontSize: 13,
      fontFamily:
        "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
      cursorBlink: true,
      theme: getTerminalTheme() as any,
      allowProposedApi: true,
      convertEol: false,
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())

    term.open(termRef.current)
    fit.fit()

    termInstanceRef.current = term
    fitRef.current = fit

    // Write header
    term.write(`\x1b[36m${agentName}\x1b[0m`)
    if (command) {
      term.write(` \x1b[90m$ ${command}\x1b[0m`)
    }
    term.write("\r\n\r\n")

    // Pipe user input to process
    dataDisposableRef.current = term.onData((data) => {
      if (currentStatusRef.current !== "running") {
        for (const character of data) {
          if (inputEscapeStateRef.current === "csi") {
            if (character >= "@" && character <= "~") {
              inputEscapeStateRef.current = "none"
            }
            continue
          }
          if (inputEscapeStateRef.current === "osc") {
            if (character === "\u0007") inputEscapeStateRef.current = "none"
            continue
          }
          if (inputEscapeStateRef.current === "escape") {
            inputEscapeStateRef.current =
              character === "[" ? "csi" : character === "]" ? "osc" : "none"
            continue
          }
          if (character === "\u001b") {
            inputEscapeStateRef.current = "escape"
            continue
          }
          if (character === "\r" || character === "\n") {
            const commandLine = inputBufferRef.current.trim()
            if (commandLine) {
              const cli = detectCli(commandLine)
              const resumeCommand = /^(claude|codex|opencode)$/i.test(cli)
                ? commandLine
                : ""
              reportActivity("running", cli, resumeCommand)
            }
            inputBufferRef.current = ""
          } else if (character === "\u0003") {
            inputBufferRef.current = ""
          } else if (character === "\u007f") {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1)
          } else if (character >= " " && character !== "\u001b") {
            inputBufferRef.current += character
          }
        }
      }

      if (processIdRef.current) {
        writeToProcess(processIdRef.current, data).catch((err) => {
          console.error("Failed to write to PTY:", err)
        })
        if (sessionIdRef.current) {
          addSessionLog(sessionIdRef.current, "command", data).catch(() => {})
        }
      } else {
        pendingInputRef.current = `${pendingInputRef.current}${data}`.slice(
          -8192
        )
      }
    })

    term.onResize(({ rows, cols }) => {
      if (processIdRef.current) {
        resizeProcess(processIdRef.current, rows, cols).catch(() => {})
      }
    })

    // Deferring one task prevents React StrictMode's probe mount from spawning a duplicate PTY.
    const startTimer = window.setTimeout(() => startShell(), 0)
    focusTerminal()

    return () => {
      window.clearTimeout(startTimer)
      disposedRef.current = true
      pendingInputRef.current = ""
      dataDisposableRef.current?.dispose()
      dataDisposableRef.current = null
      unlistenRef.current.forEach((fn) => fn())
      unlistenRef.current = []
      if (processIdRef.current) {
        killProcess(processIdRef.current).catch(() => {})
        processIdRef.current = null
      }
      try {
        term.dispose()
      } catch {}
      termInstanceRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update theme when it changes
  useEffect(() => {
    if (termInstanceRef.current) {
      termInstanceRef.current.options.theme = getTerminalTheme() as any
    }
  }, [theme, getTerminalTheme])

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      fitRef.current?.fit()
      const terminal = termInstanceRef.current
      if (terminal && processIdRef.current) {
        resizeProcess(processIdRef.current, terminal.rows, terminal.cols).catch(
          () => {}
        )
      }
    }
    const observer = new ResizeObserver(handleResize)
    if (termRef.current) observer.observe(termRef.current)
    window.addEventListener("resize", handleResize)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const stopProcess = useCallback(async () => {
    if (processIdRef.current) {
      await killProcess(processIdRef.current)
      processIdRef.current = null
      setIsRunning(false)
      reportActivity("stopped")
      if (!disposedRef.current) {
        termInstanceRef.current?.write("\r\n\x1b[33m[killed]\x1b[0m\r\n")
      }
      if (sessionIdRef.current) {
        updateSession(sessionIdRef.current, { status: "stopped" }).catch(
          () => {}
        )
      }
    }
  }, [reportActivity])

  const clearTerminal = useCallback(() => {
    if (!disposedRef.current) {
      termInstanceRef.current?.clear()
      focusTerminal()
    }
  }, [focusTerminal])

  const copyLogs = useCallback(() => {
    const term = termInstanceRef.current
    if (term && !disposedRef.current) {
      const selection = term.getSelection()
      if (selection) {
        navigator.clipboard.writeText(selection)
      }
    }
  }, [])

  const restartShell = useCallback(async () => {
    if (disposedRef.current) return
    await stopProcess()
    unlistenRef.current.forEach((fn) => fn())
    unlistenRef.current = []
    if (!disposedRef.current) {
      termInstanceRef.current?.write("\r\n\x1b[36m[restart]\x1b[0m\r\n\r\n")
    }
    await startShell()
    focusTerminal()
  }, [stopProcess, startShell, focusTerminal])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[hsl(var(--panel))]">
      <div
        className="flex h-7 shrink-0 items-center border-b border-[hsl(var(--border))] bg-[hsl(var(--panel-elevated))]"
        style={{ boxShadow: `inset 2px 0 0 ${accentColor}` }}
      >
        <div className="flex h-full min-w-32 items-center gap-1.5 border-r border-[hsl(var(--border))] px-2">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm"
            style={{ backgroundColor: accentColor }}
          >
            {cliIcon ?? <TerminalIcon className="h-3.5 w-3.5" />}
          </span>
          <span
            className="text-[10px] font-semibold"
            style={{ color: accentColor }}
          >
            {agentName}
          </span>
          <span
            className={`h-1.5 w-1.5 ${
              isRunning ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--muted))]"
            }`}
            title={isRunning ? "Process running" : "Process stopped"}
          />
        </div>
        <span className="min-w-0 flex-1 truncate px-2 text-[9px] text-[hsl(var(--muted-foreground))]">
          {workingDir}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={restartShell}
            disabled={isRunning}
            title="restart"
          >
            <RotateCw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={stopProcess}
            disabled={!isRunning}
            title="stop"
          >
            <Square className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={copyLogs}
            title="copy"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={clearTerminal}
            title="clear"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-[hsl(var(--danger))]"
              onClick={onClose}
              title="close pane"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <div
        ref={termRef}
        className="min-h-0 flex-1 overflow-hidden px-1 pt-1"
        onMouseDown={focusTerminal}
        onClick={focusTerminal}
      />
    </div>
  )
}
