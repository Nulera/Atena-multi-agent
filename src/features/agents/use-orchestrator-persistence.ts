import { useCallback, useEffect, useRef, useState } from "react"
import { getSetting, setSetting } from "@/lib/db"
import { normalizeAppError } from "@/lib/errors"
import {
  deleteOrchestration,
  deleteSquadTemplate as deleteStoredTemplate,
  listSquadTemplates,
  loadLatestOrchestration,
  saveOrchestration,
  saveSquadTemplate as saveStoredTemplate,
} from "./orchestrator-gateway"
import { parseLegacyTemplates } from "./orchestrator-template-migration"
import type { OrchestrationPlan, SquadTemplate } from "./orchestrator-types"

export const LEGACY_TEMPLATES_KEY = "atena:orchestrator:squad-templates"
export const LEGACY_MIGRATION_KEY = "migration.orchestratorTemplates.v1"
const SAVE_DELAY_MS = 500

export function useOrchestratorPersistence(workspaceId: string) {
  const [initialPlan, setInitialPlan] = useState<OrchestrationPlan | null>(null)
  const [customTemplates, setCustomTemplates] = useState<SquadTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [plan, storedTemplates, migrationMarker] = await Promise.all([
          loadLatestOrchestration(workspaceId),
          listSquadTemplates(),
          getSetting(LEGACY_MIGRATION_KEY),
        ])
        let templates = storedTemplates
        if (migrationMarker !== "complete") {
          const existingIds = new Set(
            storedTemplates.map((template) => template.id)
          )
          const legacyTemplates = parseLegacyTemplates(
            localStorage.getItem(LEGACY_TEMPLATES_KEY),
            existingIds
          )
          const imported: SquadTemplate[] = []
          for (const template of legacyTemplates) {
            imported.push(await saveStoredTemplate(template))
          }
          templates = [...storedTemplates, ...imported]
          await setSetting(LEGACY_MIGRATION_KEY, "complete")
        }
        if (!cancelled) {
          setInitialPlan(plan)
          setCustomTemplates(templates)
        }
      } catch (cause) {
        if (!cancelled)
          setError(normalizeAppError(cause, "orchestrator.load").message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    },
    []
  )

  const persistPlan = useCallback(
    (plan: OrchestrationPlan) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        saveOrchestration(workspaceId, plan).catch((cause) =>
          setError(normalizeAppError(cause, "orchestrator.save").message)
        )
      }, SAVE_DELAY_MS)
    },
    [workspaceId]
  )

  const removePlan = useCallback(async (id: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    await deleteOrchestration(id)
    setInitialPlan(null)
  }, [])

  const saveTemplate = useCallback(async (template: SquadTemplate) => {
    const saved = await saveStoredTemplate(template)
    setCustomTemplates((current) => [
      ...current.filter((candidate) => candidate.id !== saved.id),
      saved,
    ])
    return saved
  }, [])

  const deleteTemplate = useCallback(async (id: string) => {
    await deleteStoredTemplate(id)
    setCustomTemplates((current) =>
      current.filter((template) => template.id !== id)
    )
  }, [])

  return {
    initialPlan,
    customTemplates,
    isLoading,
    error,
    clearError: () => setError(null),
    persistPlan,
    removePlan,
    saveTemplate,
    deleteTemplate,
  }
}
