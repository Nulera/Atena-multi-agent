import { describe, expect, it } from "vitest"
import { normalizeAppError } from "./errors"

describe("normalizeAppError", () => {
  it("preserves structured application errors", () => {
    expect(
      normalizeAppError(
        {
          code: "PTY_NOT_FOUND",
          operation: "pty.kill",
          message: "Process not found",
          details: "process-1",
        },
        "fallback"
      )
    ).toEqual({
      code: "PTY_NOT_FOUND",
      operation: "pty.kill",
      message: "Process not found",
      details: "process-1",
    })
  })

  it("normalizes unknown failures with operation context", () => {
    expect(normalizeAppError(new Error("offline"), "git.status")).toEqual({
      code: "UNEXPECTED",
      operation: "git.status",
      message: "offline",
    })
  })
})
