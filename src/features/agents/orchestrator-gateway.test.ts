import { beforeEach, describe, expect, it, vi } from "vitest"
import type { OrchestrationPlan, SquadTemplate } from "./orchestrator-types"
import {
  appendOrchestrationEvent,
  listSquadTemplates,
  saveOrchestration,
  saveSquadTemplate,
} from "./orchestrator-gateway"

const mocks = vi.hoisted(() => ({
  invokeCommand: vi.fn(),
}))

vi.mock("@/lib/tauri-command", () => ({
  invokeCommand: mocks.invokeCommand,
}))

const plan: OrchestrationPlan = {
  id: "plan-1",
  goal: "Coordinate local CLIs",
  steps: [
    {
      id: "step-1",
      order: 0,
      agentRole: "backend",
      cliTool: "opencode",
      title: "Persist locally",
      prompt: "Implement SQLite persistence.",
      status: "running",
      processId: "ephemeral-process",
    },
  ],
}

const template: SquadTemplate = {
  id: "custom-1",
  name: "Local squad",
  description: "Codex and OpenCode",
  builtIn: false,
  steps: [
    {
      order: 0,
      agentRole: "backend",
      cliTool: "opencode",
      title: "Implement",
      prompt: "Implement locally.",
    },
  ],
}

describe("orchestrator gateway", () => {
  beforeEach(() => {
    mocks.invokeCommand.mockReset()
  })

  it("saves plans without ephemeral process IDs", async () => {
    mocks.invokeCommand.mockResolvedValue(undefined)

    await saveOrchestration("workspace-1", plan)

    expect(mocks.invokeCommand).toHaveBeenCalledWith(
      "save_orchestration",
      {
        workspaceId: "workspace-1",
        plan: {
          ...plan,
          steps: [{ ...plan.steps[0], processId: undefined }],
        },
      },
      "orchestrator.save"
    )
  })

  it("stores user templates as versioned JSON", async () => {
    mocks.invokeCommand.mockResolvedValue({
      id: template.id,
      name: template.name,
      description: template.description,
      definitionJson: JSON.stringify({ version: 1, steps: template.steps }),
      createdAt: "now",
      updatedAt: "now",
    })

    await expect(saveSquadTemplate(template)).resolves.toEqual(template)
    expect(mocks.invokeCommand).toHaveBeenCalledWith(
      "save_squad_template",
      {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          definitionJson: JSON.stringify({ version: 1, steps: template.steps }),
        },
      },
      "orchestrator.template.save"
    )
  })

  it("ignores stored templates with unsupported definition versions", async () => {
    mocks.invokeCommand.mockResolvedValue([
      {
        id: "future",
        name: "Future",
        description: "Unsupported",
        definitionJson: JSON.stringify({ version: 2, steps: template.steps }),
        createdAt: "now",
        updatedAt: "now",
      },
    ])

    await expect(listSquadTemplates()).resolves.toEqual([])
  })

  it("appends lifecycle events with optional step context", async () => {
    mocks.invokeCommand.mockResolvedValue({ id: "event-1" })

    await appendOrchestrationEvent(
      "plan-1",
      "step-1",
      "started",
      "OpenCode started"
    )

    expect(mocks.invokeCommand).toHaveBeenCalledWith(
      "append_orchestration_event",
      {
        orchestrationId: "plan-1",
        stepId: "step-1",
        eventType: "started",
        content: "OpenCode started",
      },
      "orchestrator.event.append"
    )
  })
})
