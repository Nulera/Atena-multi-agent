import { describe, expect, it } from "vitest"
import type { OrchestrationPlan } from "./orchestrator-types"
import {
  clearStepProcess,
  processIdForStep,
  withStepProcess,
} from "./orchestrator-domain"

const plan: OrchestrationPlan = {
  id: "plan-1",
  goal: "refactor",
  steps: [
    {
      id: "step-1",
      order: 0,
      agentRole: "backend",
      cliTool: "codex",
      title: "Run",
      prompt: "Do work",
      status: "running",
    },
  ],
}

describe("orchestrator process tracking", () => {
  it("stores the backend process id on the matching step", () => {
    const next = withStepProcess(plan, "step-1", "process-42")

    expect(processIdForStep(next, "step-1")).toBe("process-42")
    expect(plan.steps[0].processId).toBeUndefined()
  })

  it("clears the process id and returns the step to pending", () => {
    const running = withStepProcess(plan, "step-1", "process-42")
    const next = clearStepProcess(running, "step-1")

    expect(next.steps[0]).toMatchObject({ status: "pending" })
    expect(next.steps[0].processId).toBeUndefined()
  })
})
