import { invokeCommand } from "@/lib/tauri-command"
import {
  type OrchestrationEvent,
  type OrchestrationPlan,
  type SquadTemplate,
  type SquadTemplateRecord,
} from "./orchestrator-types"
import { parseLegacyTemplates } from "./orchestrator-template-migration"

interface SquadTemplateInput {
  id: string
  name: string
  description: string
  definitionJson: string
}

function withoutProcessIds(plan: OrchestrationPlan): OrchestrationPlan {
  return {
    ...plan,
    steps: plan.steps.map(({ processId: _processId, ...step }) => step),
  }
}

function decodeTemplate(record: SquadTemplateRecord): SquadTemplate | null {
  let definition: unknown
  try {
    definition = JSON.parse(record.definitionJson)
  } catch {
    return null
  }
  if (
    typeof definition !== "object" ||
    definition === null ||
    !("version" in definition) ||
    definition.version !== 1 ||
    !("steps" in definition)
  ) {
    return null
  }

  return (
    parseLegacyTemplates(
      JSON.stringify([
        {
          id: record.id,
          name: record.name,
          description: record.description,
          steps: definition.steps,
        },
      ]),
      new Set()
    )[0] ?? null
  )
}

export async function saveOrchestration(
  workspaceId: string,
  plan: OrchestrationPlan
): Promise<void> {
  await invokeCommand(
    "save_orchestration",
    { workspaceId, plan: withoutProcessIds(plan) },
    "orchestrator.save"
  )
}

export async function loadLatestOrchestration(
  workspaceId: string
): Promise<OrchestrationPlan | null> {
  return await invokeCommand<OrchestrationPlan | null>(
    "load_latest_orchestration",
    { workspaceId },
    "orchestrator.loadLatest"
  )
}

export async function deleteOrchestration(id: string): Promise<void> {
  await invokeCommand("delete_orchestration", { id }, "orchestrator.delete")
}

export async function appendOrchestrationEvent(
  orchestrationId: string,
  stepId: string | null,
  eventType: string,
  content: string
): Promise<OrchestrationEvent> {
  return await invokeCommand<OrchestrationEvent>(
    "append_orchestration_event",
    { orchestrationId, stepId, eventType, content },
    "orchestrator.event.append"
  )
}

export async function listOrchestrationEvents(
  orchestrationId: string
): Promise<OrchestrationEvent[]> {
  return await invokeCommand<OrchestrationEvent[]>(
    "list_orchestration_events",
    { orchestrationId },
    "orchestrator.event.list"
  )
}

export async function listSquadTemplates(): Promise<SquadTemplate[]> {
  const records = await invokeCommand<SquadTemplateRecord[]>(
    "list_squad_templates",
    undefined,
    "orchestrator.template.list"
  )
  return records
    .map(decodeTemplate)
    .filter((template): template is SquadTemplate => template !== null)
}

export async function saveSquadTemplate(
  template: SquadTemplate
): Promise<SquadTemplate> {
  if (template.builtIn) {
    throw new Error("Built-in templates cannot be persisted")
  }
  const input: SquadTemplateInput = {
    id: template.id,
    name: template.name,
    description: template.description,
    definitionJson: JSON.stringify({ version: 1, steps: template.steps }),
  }
  const record = await invokeCommand<SquadTemplateRecord>(
    "save_squad_template",
    { template: input },
    "orchestrator.template.save"
  )
  const saved = decodeTemplate(record)
  if (!saved) throw new Error("Stored template has an invalid definition")
  return saved
}

export async function deleteSquadTemplate(id: string): Promise<void> {
  await invokeCommand(
    "delete_squad_template",
    { id },
    "orchestrator.template.delete"
  )
}
