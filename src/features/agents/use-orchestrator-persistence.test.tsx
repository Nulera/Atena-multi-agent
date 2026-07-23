import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { OrchestrationPlan, SquadTemplate } from "./orchestrator-types"
import {
  LEGACY_MIGRATION_KEY,
  LEGACY_TEMPLATES_KEY,
  useOrchestratorPersistence,
} from "./use-orchestrator-persistence"

const mocks = vi.hoisted(() => ({
  loadLatestOrchestration: vi.fn(),
  listSquadTemplates: vi.fn(),
  saveOrchestration: vi.fn(),
  deleteOrchestration: vi.fn(),
  saveSquadTemplate: vi.fn(),
  deleteSquadTemplate: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}))

vi.mock("./orchestrator-gateway", () => ({
  loadLatestOrchestration: mocks.loadLatestOrchestration,
  listSquadTemplates: mocks.listSquadTemplates,
  saveOrchestration: mocks.saveOrchestration,
  deleteOrchestration: mocks.deleteOrchestration,
  saveSquadTemplate: mocks.saveSquadTemplate,
  deleteSquadTemplate: mocks.deleteSquadTemplate,
}))
vi.mock("@/lib/db", () => ({
  getSetting: mocks.getSetting,
  setSetting: mocks.setSetting,
}))

const plan: OrchestrationPlan = {
  id: "plan-1",
  goal: "Coordinate CLIs",
  steps: [],
}
const template: SquadTemplate = {
  id: "custom-1",
  name: "Local squad",
  description: "Local",
  builtIn: false,
  steps: [
    {
      order: 0,
      agentRole: "backend",
      cliTool: "opencode",
      title: "Implement",
      prompt: "Implement locally",
    },
  ],
}

describe("orchestrator persistence", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    const storage = new Map<string, string>()
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    })
    mocks.loadLatestOrchestration.mockResolvedValue(plan)
    mocks.listSquadTemplates.mockResolvedValue([template])
    mocks.getSetting.mockResolvedValue("complete")
    mocks.saveOrchestration.mockResolvedValue(undefined)
    mocks.deleteOrchestration.mockResolvedValue(undefined)
    mocks.deleteSquadTemplate.mockResolvedValue(undefined)
  })

  it("loads the latest local plan and templates", async () => {
    const { result } = renderHook(() =>
      useOrchestratorPersistence("workspace-1")
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.initialPlan).toEqual(plan)
    expect(result.current.customTemplates).toEqual([template])
  })

  it("imports legacy templates once and records the marker", async () => {
    mocks.listSquadTemplates.mockResolvedValue([])
    mocks.getSetting.mockResolvedValue(null)
    mocks.saveSquadTemplate.mockResolvedValue(template)
    localStorage.setItem(LEGACY_TEMPLATES_KEY, JSON.stringify([template]))

    renderHook(() => useOrchestratorPersistence("workspace-1"))

    await waitFor(() =>
      expect(mocks.saveSquadTemplate).toHaveBeenCalledWith(template)
    )
    expect(mocks.setSetting).toHaveBeenCalledWith(
      LEGACY_MIGRATION_KEY,
      "complete"
    )
  })

  it("surfaces the AppError message when loading fails", async () => {
    mocks.loadLatestOrchestration.mockRejectedValue({
      code: "DB_ERROR",
      operation: "orchestrator.loadLatest",
      message: "database is locked",
    })

    const { result } = renderHook(() =>
      useOrchestratorPersistence("workspace-1")
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe("database is locked")
  })

  it("surfaces the AppError message when saving fails", async () => {
    vi.useFakeTimers()
    mocks.saveOrchestration.mockRejectedValue({
      code: "DB_ERROR",
      operation: "orchestrator.save",
      message: "NOT NULL constraint failed",
    })
    const { result } = renderHook(() =>
      useOrchestratorPersistence("workspace-1")
    )
    await act(async () => Promise.resolve())

    act(() => result.current.persistPlan(plan))
    await act(() => vi.advanceTimersByTimeAsync(500))

    expect(result.current.error).toBe("NOT NULL constraint failed")
    vi.useRealTimers()
  })

  it("debounces plan writes", async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useOrchestratorPersistence("workspace-1")
    )
    await act(async () => Promise.resolve())

    act(() => result.current.persistPlan(plan))
    await act(() => vi.advanceTimersByTimeAsync(500))

    expect(mocks.saveOrchestration).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
