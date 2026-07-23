import { describe, expect, it } from "vitest"
import {
  detectCli,
  initialTerminalState,
  stripAnsi,
  transitionTerminal,
} from "./terminal-domain"

describe("terminal domain", () => {
  it("detects supported interactive CLIs from command lines", () => {
    expect(detectCli("codex --resume")).toBe("codex")
    expect(detectCli("& 'C:\\tools\\claude.exe'")).toBe("claude")
    expect(detectCli("opencode")).toBe("opencode")
    expect(detectCli("npm test")).toBe("npm")
  })

  it("removes ANSI control sequences from terminal output", () => {
    expect(stripAnsi("\u001b[31mfailed\u001b[0m\r\n")).toBe("failed\r\n")
  })

  it("moves through explicit lifecycle states", () => {
    const starting = transitionTerminal(initialTerminalState, {
      type: "START",
      cli: "codex",
      resumeCommand: "codex --resume",
    })
    const attached = transitionTerminal(starting, {
      type: "ATTACHED",
      processId: "process-1",
    })
    const stopped = transitionTerminal(attached, { type: "EXITED" })

    expect(starting.status).toBe("starting")
    expect(attached).toMatchObject({
      status: "running",
      processId: "process-1",
      cli: "codex",
    })
    expect(stopped).toMatchObject({ status: "stopped", processId: null })
  })

  it("keeps a plain PowerShell open while attaching its process", () => {
    const starting = transitionTerminal(initialTerminalState, {
      type: "START",
      cli: "PowerShell",
    })

    expect(
      transitionTerminal(starting, {
        type: "ATTACHED",
        processId: "process-1",
      })
    ).toMatchObject({
      status: "open",
      processId: "process-1",
      cli: "PowerShell",
    })
  })

  it("ignores late activity after the terminal starts stopping", () => {
    const running = transitionTerminal(
      transitionTerminal(initialTerminalState, {
        type: "START",
        cli: "codex",
      }),
      { type: "ATTACHED", processId: "process-1" }
    )
    const stopping = transitionTerminal(running, { type: "STOP" })

    expect(
      transitionTerminal(stopping, { type: "ACTIVITY", cli: "claude" })
    ).toEqual(stopping)
    expect(transitionTerminal(stopping, { type: "PROMPT" })).toEqual(stopping)
  })

  it("ignores late activity after the terminal exits", () => {
    const stopped = transitionTerminal(
      {
        ...initialTerminalState,
        status: "running",
        processId: "process-1",
        cli: "codex",
      },
      { type: "EXITED" }
    )

    expect(
      transitionTerminal(stopped, { type: "ACTIVITY", cli: "claude" })
    ).toEqual(stopped)
    expect(transitionTerminal(stopped, { type: "PROMPT" })).toEqual(stopped)
  })

  it("keeps shutdown events idempotent after the terminal exits", () => {
    const stopped = {
      ...initialTerminalState,
      status: "stopped" as const,
    }

    expect(transitionTerminal(stopped, { type: "EXITED" })).toBe(stopped)
    expect(transitionTerminal(stopped, { type: "STOP" })).toBe(stopped)
  })
})
