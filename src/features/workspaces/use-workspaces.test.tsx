import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Workspace } from "@/types"
import type { WorkspaceGateway } from "./workspace-gateway"
import { useWorkspaces } from "./use-workspaces"

const workspace: Workspace = {
  id: "workspace-1",
  name: "Atena",
  path: "C:\\repo",
  description: "",
  createdAt: "now",
  updatedAt: "now",
}

describe("useWorkspaces", () => {
  it("loads workspaces and refreshes after creation", async () => {
    const gateway: WorkspaceGateway = {
      list: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([workspace]),
      create: vi.fn().mockResolvedValue(workspace),
      remove: vi.fn().mockResolvedValue(undefined),
    }

    const { result } = renderHook(() => useWorkspaces(gateway))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.create("Atena", "C:\\repo", ""))

    expect(result.current.workspaces).toEqual([workspace])
    expect(gateway.create).toHaveBeenCalledWith("Atena", "C:\\repo", "")
    expect(gateway.list).toHaveBeenCalledTimes(2)
  })

  it("exposes normalized gateway failures", async () => {
    const gateway: WorkspaceGateway = {
      list: vi.fn().mockRejectedValue({
        code: "DB_ERROR",
        operation: "workspace.list",
        message: "Database unavailable",
      }),
      create: vi.fn(),
      remove: vi.fn(),
    }

    const { result } = renderHook(() => useWorkspaces(gateway))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toMatchObject({
      operation: "workspace.list",
      message: "Database unavailable",
    })
  })
})
