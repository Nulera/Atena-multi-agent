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
})
