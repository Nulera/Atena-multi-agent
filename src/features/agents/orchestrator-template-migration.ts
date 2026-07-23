import {
  defaultSquadTemplates,
  type CliTool,
  type SquadTemplate,
  type SquadTemplateStep,
} from "./orchestrator-types"

const cliTools: ReadonlySet<string> = new Set([
  "codex",
  "claude",
  "opencode",
  "git",
  "shell",
])
const builtInTemplateIds = new Set(
  defaultSquadTemplates.map((template) => template.id)
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isCliTool(value: unknown): value is CliTool {
  return typeof value === "string" && cliTools.has(value)
}

function normalizeStep(value: unknown): SquadTemplateStep | null {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.order) ||
    (value.order as number) < 0 ||
    !isNonEmptyString(value.agentRole) ||
    !isCliTool(value.cliTool) ||
    !isNonEmptyString(value.title) ||
    typeof value.prompt !== "string"
  ) {
    return null
  }

  const dependencies = value.dependsOn
  if (
    dependencies !== undefined &&
    (!Array.isArray(dependencies) ||
      dependencies.some(
        (dependency) => !Number.isInteger(dependency) || dependency < 0
      ))
  ) {
    return null
  }

  return {
    order: value.order as number,
    agentRole: value.agentRole.trim(),
    cliTool: value.cliTool,
    title: value.title.trim(),
    prompt: value.prompt,
    dependsOn:
      dependencies && dependencies.length > 0
        ? (dependencies as number[])
        : undefined,
  }
}

function normalizeTemplate(value: unknown): SquadTemplate | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    builtInTemplateIds.has(value.id) ||
    !isNonEmptyString(value.name) ||
    typeof value.description !== "string" ||
    !Array.isArray(value.steps) ||
    value.steps.length === 0
  ) {
    return null
  }

  const steps = value.steps.map(normalizeStep)
  if (steps.some((step) => step === null)) return null

  const normalizedSteps = steps as SquadTemplateStep[]
  const orders = new Set(normalizedSteps.map((step) => step.order))
  if (orders.size !== normalizedSteps.length) return null
  if (
    normalizedSteps.some((step) =>
      step.dependsOn?.some((dependency) => !orders.has(dependency))
    )
  ) {
    return null
  }

  return {
    id: value.id.trim(),
    name: value.name.trim(),
    description: value.description,
    steps: normalizedSteps,
    builtIn: false,
  }
}

export function parseLegacyTemplates(
  raw: string | null,
  existingIds: ReadonlySet<string>
): SquadTemplate[] {
  if (!raw) return []

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(value)) return []

  const seenIds = new Set(existingIds)
  const templates: SquadTemplate[] = []
  for (const candidate of value) {
    const template = normalizeTemplate(candidate)
    if (!template || seenIds.has(template.id)) continue
    seenIds.add(template.id)
    templates.push(template)
  }
  return templates
}
