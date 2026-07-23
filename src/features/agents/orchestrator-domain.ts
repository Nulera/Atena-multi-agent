import type {
  OrchestrationPlan,
  OrchestrationStep,
} from "./orchestrator-types"

function updateStep(
  plan: OrchestrationPlan,
  stepId: string,
  update: (step: OrchestrationStep) => OrchestrationStep
): OrchestrationPlan {
  return {
    ...plan,
    steps: plan.steps.map((step) =>
      step.id === stepId ? update(step) : step
    ),
  }
}

export function withStepProcess(
  plan: OrchestrationPlan,
  stepId: string,
  processId: string
): OrchestrationPlan {
  return updateStep(plan, stepId, (step) => ({
    ...step,
    status: "running",
    processId,
  }))
}

export function processIdForStep(
  plan: OrchestrationPlan | null,
  stepId: string
): string | undefined {
  return plan?.steps.find((step) => step.id === stepId)?.processId
}

export function clearStepProcess(
  plan: OrchestrationPlan,
  stepId: string
): OrchestrationPlan {
  return updateStep(plan, stepId, ({ processId: _processId, ...step }) => ({
    ...step,
    status: "pending",
  }))
}
