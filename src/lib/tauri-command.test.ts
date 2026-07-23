import { describe, expect, it } from "vitest"
import { createCommandGateway } from "./tauri-command"

describe("Tauri command gateway", () => {
  it("returns successful command results", async () => {
    const gateway = createCommandGateway(async () => ({ id: "workspace-1" }))

    await expect(
      gateway<{ id: string }>("list_workspaces", undefined, "workspace.list")
    ).resolves.toEqual({ id: "workspace-1" })
  })

  it("normalizes rejected commands with operation context", async () => {
    const gateway = createCommandGateway(async () => {
      throw new Error("offline")
    })

    await expect(
      gateway("git_status", { path: "C:\\repo" }, "git.status")
    ).rejects.toEqual({
      code: "UNEXPECTED",
      operation: "git.status",
      message: "offline",
    })
  })
})
