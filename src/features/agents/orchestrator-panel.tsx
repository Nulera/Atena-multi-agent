import { useState, useCallback, useEffect, useMemo } from "react"
import {
  Cpu,
  Play,
  Square,
  Check,
  Clock,
  Plus,
  RefreshCw,
  ChevronRight,
  Layers3,
  Save,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  defaultSquadTemplates,
  cliToolLabels,
  cliToolColors,
  type OrchestrationStep,
  type OrchestrationPlan,
  type SquadTemplate,
  type CliTool,
} from "./orchestrator-types"
import { useToast } from "@/components/ui/toast"
import { spawnProcess, killProcess } from "@/lib/pty"

interface OrchestratorPanelProps {
  workspaceId: string
  workspacePath: string
}

const customTemplatesKey = "atena:orchestrator:squad-templates"

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function instantiateTemplate(template: SquadTemplate, offset = 0): OrchestrationStep[] {
  const orderMap = new Map(
    template.steps.map((step, index) => [step.order, offset + index])
  )
  return template.steps.map((step, index) => {
    const dependsOn = step.dependsOn
      ?.map((dependency) => orderMap.get(dependency))
      .filter((dependency): dependency is number => dependency !== undefined)
    return {
      ...step,
      id: createId("step"),
      order: offset + index,
      dependsOn: dependsOn?.length ? dependsOn : undefined,
      status: dependsOn?.length ? "waiting" : "pending",
      resultSummary: undefined,
    }
  })
}

const stepStatusConfig: Record<
  OrchestrationStep["status"],
  { icon: React.ReactNode; color: string; label: string }
> = {
  pending: {
    icon: <Clock className="h-3 w-3" />,
    color: "text-[hsl(var(--muted))]",
    label: "fila",
  },
  running: {
    icon: <Play className="h-3 w-3" />,
    color: "text-[hsl(var(--accent))]",
    label: "running",
  },
  waiting: {
    icon: <ChevronRight className="h-3 w-3" />,
    color: "text-[hsl(var(--warning))]",
    label: "waiting",
  },
  completed: {
    icon: <Check className="h-3 w-3" />,
    color: "text-[hsl(var(--success))]",
    label: "done",
  },
  failed: {
    icon: <Square className="h-3 w-3" />,
    color: "text-[hsl(var(--danger))]",
    label: "failed",
  },
}

export function OrchestratorPanel({
  workspaceId,
  workspacePath,
}: OrchestratorPanelProps) {
  const [goal, setGoal] = useState("")
  const [plan, setPlan] = useState<OrchestrationPlan | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<SquadTemplate | null>(null)
  const [customTemplates, setCustomTemplates] = useState<SquadTemplate[]>([])
  const [showSquads, setShowSquads] = useState(false)
  const [showStepForm, setShowStepForm] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [stepRole, setStepRole] = useState("")
  const [stepTool, setStepTool] = useState<CliTool>("codex")
  const [stepTitle, setStepTitle] = useState("")
  const [stepPrompt, setStepPrompt] = useState("")
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [runningSteps, setRunningSteps] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const squadTemplates = useMemo(
    () => [...defaultSquadTemplates, ...customTemplates],
    [customTemplates]
  )

  useEffect(() => {
    try {
      const stored = localStorage.getItem(customTemplatesKey)
      if (!stored) return
      const parsed: unknown = JSON.parse(stored)
      if (Array.isArray(parsed)) setCustomTemplates(parsed as SquadTemplate[])
    } catch (error) {
      console.error("Failed to load squad templates:", error)
    }
  }, [])

  const runningCount = plan?.steps.filter((s) => s.status === "running").length ?? 0
  const doneCount = plan?.steps.filter((s) => s.status === "completed").length ?? 0
  const totalCount = plan?.steps.length ?? 0

  const generatePlan = useCallback(() => {
    if (!goal.trim()) return
    const steps = selectedTemplate ? instantiateTemplate(selectedTemplate) : []
    setPlan({
      id: createId("plan"),
      goal: goal.trim(),
      templateId: selectedTemplate?.id,
      steps,
    })
    toast({
      title: selectedTemplate ? "plano criado com squad" : "plano aberto criado",
      description: selectedTemplate
        ? `${steps.length} etapas`
        : "defina o squad conforme o trabalho evoluir",
      variant: "success",
    })
  }, [goal, selectedTemplate, toast])

  const appendTemplate = useCallback(
    (template: SquadTemplate) => {
      setPlan((current) => {
        if (!current) return current
        return {
          ...current,
          templateId: current.steps.length === 0 ? template.id : undefined,
          steps: [
            ...current.steps,
            ...instantiateTemplate(template, current.steps.length),
          ],
        }
      })
      setShowSquads(false)
      toast({
        title: "squad adicionado",
        description: `${template.name} · ${template.steps.length} etapas`,
        variant: "success",
      })
    },
    [toast]
  )

  const addStep = useCallback(() => {
    if (!stepRole.trim() || !stepTitle.trim()) return
    setPlan((current) => {
      if (!current) return current
      const previous = current.steps.at(-1)
      const dependsOn = previous ? [previous.order] : undefined
      const step: OrchestrationStep = {
        id: createId("step"),
        order: current.steps.length,
        agentRole: stepRole.trim(),
        cliTool: stepTool,
        title: stepTitle.trim(),
        prompt: stepPrompt.trim(),
        dependsOn,
        status:
          previous && previous.status !== "completed" ? "waiting" : "pending",
      }
      return {
        ...current,
        templateId: undefined,
        steps: [...current.steps, step],
      }
    })
    setStepRole("")
    setStepTitle("")
    setStepPrompt("")
    setShowStepForm(false)
    toast({ title: "agente adicionado ao plano", variant: "success" })
  }, [stepPrompt, stepRole, stepTitle, stepTool, toast])

  const saveSquadTemplate = useCallback(() => {
    if (!plan?.steps.length || !templateName.trim()) return
    const template: SquadTemplate = {
      id: createId("custom-squad"),
      name: templateName.trim(),
      description:
        templateDescription.trim() ||
        plan.steps.map((step) => step.agentRole).join(" + "),
      builtIn: false,
      steps: plan.steps.map(
        ({ id: _id, status: _status, resultSummary: _summary, ...step }) => step
      ),
    }
    const next = [...customTemplates, template]
    setCustomTemplates(next)
    localStorage.setItem(customTemplatesKey, JSON.stringify(next))
    setTemplateName("")
    setTemplateDescription("")
    setShowTemplateForm(false)
    toast({
      title: "template de squad criado",
      description: template.name,
      variant: "success",
    })
  }, [customTemplates, plan, templateDescription, templateName, toast])

  const deleteTemplate = useCallback(
    (templateId: string) => {
      const next = customTemplates.filter((template) => template.id !== templateId)
      setCustomTemplates(next)
      localStorage.setItem(customTemplatesKey, JSON.stringify(next))
      if (selectedTemplate?.id === templateId) setSelectedTemplate(null)
    },
    [customTemplates, selectedTemplate]
  )

  const runStep = useCallback(
    async (step: OrchestrationStep) => {
      if (runningSteps.has(step.id)) return

      if (plan) {
        const deps = step.dependsOn ?? []
        const allDone = deps.every((depOrder) => {
          const dep = plan.steps.find((s) => s.order === depOrder)
          return dep?.status === "completed"
        })
        if (!allDone) {
          toast({
            title: "dependencies not met",
            description: "complete previous steps first",
            variant: "warning",
          })
          return
        }
      }

      setRunningSteps((prev) => new Set(prev).add(step.id))

      setPlan((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          steps: prev.steps.map((s) =>
            s.id === step.id ? { ...s, status: "running" } : s
          ),
        }
      })

      const fullPrompt = [
        `[Atena Orchestrator]`,
        `Goal: ${plan?.goal ?? goal}`,
        `Step ${step.order + 1}/${plan?.steps.length ?? 1}: ${step.title}`,
        `Role: ${step.agentRole}`,
        ``,
        step.prompt,
      ].join("\n")

      const command = `${step.cliTool} "${fullPrompt.replace(/"/g, '\\"')}"`

      try {
        await spawnProcess(command, workspacePath, step.id)
        toast({
          title: `step ${step.order + 1} started`,
          description: `${cliToolLabels[step.cliTool]} → ${step.title}`,
          variant: "success",
        })
      } catch (err) {
        toast({ title: "failed to start", description: String(err), variant: "danger" })
        setPlan((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            steps: prev.steps.map((s) =>
              s.id === step.id ? { ...s, status: "failed" } : s
            ),
          }
        })
      }

      setRunningSteps((prev) => {
        const next = new Set(prev)
        next.delete(step.id)
        return next
      })
    },
    [plan, goal, runningSteps, workspacePath, toast]
  )

  const markStepDone = useCallback((stepId: string) => {
    setPlan((prev) => {
      if (!prev) return prev
      const completedSteps = prev.steps.map((step) =>
        step.id === stepId
          ? { ...step, status: "completed" as const }
          : step
      )
      return {
        ...prev,
        steps: completedSteps.map((step) => {
          if (step.status !== "waiting") return step
          const dependenciesDone = (step.dependsOn ?? []).every(
            (dependencyOrder) =>
              completedSteps.some(
                (candidate) =>
                  candidate.order === dependencyOrder &&
                  candidate.status === "completed"
              )
          )
          return dependenciesDone
            ? { ...step, status: "pending" as const }
            : step
        }),
      }
    })
  }, [])

  const stopStep = useCallback(
    async (stepId: string) => {
      try {
        await killProcess(stepId)
        setPlan((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            steps: prev.steps.map((s) =>
              s.id === stepId ? { ...s, status: "pending" } : s
            ),
          }
        })
      } catch (err) {
        toast({ title: "error", description: String(err), variant: "danger" })
      }
    },
    [toast]
  )

  const resetPlan = useCallback(() => {
    setPlan(null)
    setSelectedTemplate(null)
    setGoal("")
    setShowSquads(false)
    setShowStepForm(false)
    setShowTemplateForm(false)
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Control plane header */}
      <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-3 py-1.5">
        <Cpu className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
        <span className="text-xs font-medium">orquestrador</span>
        {plan && (
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-[hsl(var(--accent))]">{runningCount} running</span>
            <span className="text-[hsl(var(--success))]">{doneCount} done</span>
            <span className="text-[hsl(var(--muted))]">{totalCount} total</span>
          </div>
        )}
        {plan && (
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-[10px]" onClick={resetPlan}>
            <RefreshCw className="h-2.5 w-2.5" />
            reset
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!plan ? (
          /* Planning phase */
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted))]">
                descrevendo o pedido
              </label>
              <Textarea
                id={`orchestrator-goal-${workspaceId}`}
                placeholder="ex: criar landing page para imobiliária com copy persuasiva, layout moderno, responsivo e SEO básico"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="min-h-[70px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted))]">
                estrutura inicial <span className="normal-case tracking-normal">(opcional)</span>
              </label>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className={cn(
                    "border p-2.5 text-left transition-colors cursor-pointer",
                    !selectedTemplate
                      ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)]"
                      : "border-[hsl(var(--border))] hover:border-[hsl(var(--border-strong))]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                    <p className="text-xs font-medium">Plano aberto</p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[hsl(var(--muted))]">
                    Comece sem squad e adicione agentes conforme o trabalho evoluir.
                  </p>
                </button>
                {squadTemplates.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "group relative border transition-colors",
                      selectedTemplate?.id === t.id
                        ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)]"
                        : "border-[hsl(var(--border))] hover:border-[hsl(var(--border-strong))]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate(t)}
                      className="w-full p-2.5 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Layers3 className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                        <p className="text-xs font-medium">{t.name}</p>
                        {!t.builtIn && (
                          <span className="ml-auto text-[8px] uppercase tracking-wider text-[hsl(var(--accent))]">
                            personalizado
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-[hsl(var(--muted))]">
                        {t.description}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {t.steps.map((s) => (
                          <span
                            key={s.order}
                            className={cn(
                              "text-[9px] font-mono",
                              cliToolColors[s.cliTool as CliTool]
                            )}
                          >
                            {cliToolLabels[s.cliTool as CliTool]}
                          </span>
                        ))}
                      </div>
                    </button>
                    {!t.builtIn && (
                      <button
                        type="button"
                        className="absolute bottom-2 right-2 hidden p-1 text-[hsl(var(--muted))] hover:text-[hsl(var(--danger))] group-hover:block"
                        onClick={() => deleteTemplate(t.id)}
                        title="excluir template"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="default"
              size="md"
              onClick={generatePlan}
              disabled={!goal.trim()}
              className="w-full"
            >
              <Plus className="h-3.5 w-3.5" />
              {selectedTemplate ? "criar plano com squad" : "criar plano aberto"}
            </Button>
          </div>
        ) : (
          /* Execution phase — queue of agents */
          <div className="mx-auto max-w-2xl space-y-1.5">
            {/* Goal */}
            <div className="border border-[hsl(var(--border))] bg-[hsl(var(--panel))] p-2.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted))]">
                      pedido
                    </p>
                    <span className="border border-[hsl(var(--border))] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      {plan.templateId ? "template aplicado" : "squad em definição"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs">{plan.goal}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowStepForm((open) => !open)
                      setShowSquads(false)
                      setShowTemplateForm(false)
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    agente
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowSquads((open) => !open)
                      setShowStepForm(false)
                      setShowTemplateForm(false)
                    }}
                  >
                    <Layers3 className="h-3 w-3" />
                    template
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!plan.steps.length}
                    onClick={() => {
                      setShowTemplateForm((open) => !open)
                      setShowStepForm(false)
                      setShowSquads(false)
                    }}
                  >
                    <Save className="h-3 w-3" />
                    salvar squad
                  </Button>
                </div>
              </div>
            </div>

            {showStepForm && (
              <div className="border border-[hsl(var(--accent)/0.35)] bg-[hsl(var(--panel))] p-3">
                <div className="mb-2">
                  <p className="text-xs font-medium">Adicionar agente ao plano</p>
                  <p className="text-[10px] text-[hsl(var(--muted))]">
                    A nova etapa dependerá da etapa anterior. O restante do squad pode ser definido depois.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                  <Input
                    placeholder="papel do agente, ex.: pesquisador"
                    value={stepRole}
                    onChange={(event) => setStepRole(event.target.value)}
                  />
                  <Select
                    className="h-7 text-xs"
                    value={stepTool}
                    onChange={(event) => setStepTool(event.target.value as CliTool)}
                  >
                    {Object.entries(cliToolLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input
                  className="mt-2"
                  placeholder="entrega da etapa"
                  value={stepTitle}
                  onChange={(event) => setStepTitle(event.target.value)}
                />
                <Textarea
                  className="mt-2 min-h-[70px]"
                  placeholder="instruções, contexto e resultado esperado"
                  value={stepPrompt}
                  onChange={(event) => setStepPrompt(event.target.value)}
                />
                <div className="mt-2 flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setShowStepForm(false)}>
                    cancelar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={addStep}
                    disabled={!stepRole.trim() || !stepTitle.trim()}
                  >
                    adicionar ao plano
                  </Button>
                </div>
              </div>
            )}

            {showSquads && (
              <div className="grid gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--panel))] p-2 sm:grid-cols-2">
                {squadTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => appendTemplate(template)}
                    className="border border-[hsl(var(--border))] p-2 text-left transition-colors hover:border-[hsl(var(--accent))]"
                  >
                    <div className="flex items-center gap-2">
                      <Layers3 className="h-3 w-3 text-[hsl(var(--accent))]" />
                      <span className="text-xs font-medium">{template.name}</span>
                      <span className="ml-auto text-[9px] text-[hsl(var(--muted))]">
                        {template.steps.length} etapas
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-[hsl(var(--muted))]">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {showTemplateForm && (
              <div className="border border-[hsl(var(--border))] bg-[hsl(var(--panel))] p-3">
                <p className="text-xs font-medium">Salvar composição como template</p>
                <p className="mb-2 text-[10px] text-[hsl(var(--muted))]">
                  A ordem, os papéis, as ferramentas e as dependências serão reutilizados.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="nome do squad"
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                  />
                  <Input
                    placeholder="quando usar este template"
                    value={templateDescription}
                    onChange={(event) => setTemplateDescription(event.target.value)}
                  />
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setShowTemplateForm(false)}>
                    cancelar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={saveSquadTemplate}
                    disabled={!templateName.trim()}
                  >
                    <Save className="h-3 w-3" />
                    criar template
                  </Button>
                </div>
              </div>
            )}

            {plan.steps.length === 0 && !showStepForm && !showSquads && (
              <button
                type="button"
                onClick={() => setShowStepForm(true)}
                className="flex w-full flex-col items-center border border-dashed border-[hsl(var(--border-strong))] px-4 py-9 text-center transition-colors hover:border-[hsl(var(--accent)/0.7)] hover:bg-[hsl(var(--accent)/0.03)]"
              >
                <Plus className="h-5 w-5 text-[hsl(var(--accent))]" />
                <span className="mt-2 text-xs font-medium">Definir o primeiro agente</span>
                <span className="mt-1 text-[10px] text-[hsl(var(--muted))]">
                  O plano está aberto. Adicione apenas o papel necessário para começar.
                </span>
              </button>
            )}

            {/* Steps as queue */}
            {plan.steps.map((step) => {
              const status = stepStatusConfig[step.status]
              const isRunning = step.status === "running"
              const canRun =
                step.status === "pending" &&
                (step.dependsOn ?? []).every((depOrder) => {
                  const dep = plan.steps.find((s) => s.order === depOrder)
                  return dep?.status === "completed"
                })

              return (
                <div
                  key={step.id}
                  className={cn(
                    "border p-2.5 transition-colors",
                    isRunning
                      ? "border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.04)]"
                      : step.status === "completed"
                      ? "border-[hsl(var(--success)/0.2)] bg-[hsl(var(--panel))]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--panel))]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {/* Step number */}
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center text-[10px] font-mono",
                        step.status === "completed"
                          ? "text-[hsl(var(--success))]"
                          : isRunning
                          ? "text-[hsl(var(--accent))]"
                          : "text-[hsl(var(--muted))]"
                      )}
                    >
                      {step.status === "completed" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        step.order + 1
                      )}
                    </div>

                    {/* Tool + title */}
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-mono",
                        cliToolColors[step.cliTool]
                      )}
                    >
                      {cliToolLabels[step.cliTool]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {step.title}
                    </span>

                    {/* Status */}
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-0.5 text-[9px]",
                        status.color
                      )}
                    >
                      {status.icon}
                      {status.label}
                    </span>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-0.5">
                      {canRun && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => runStep(step)}
                          title="run"
                        >
                          <Play className="h-2.5 w-2.5" />
                        </Button>
                      )}
                      {isRunning && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => stopStep(step.id)}
                            title="stop"
                          >
                            <Square className="h-2.5 w-2.5 text-[hsl(var(--danger))]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => markStepDone(step.id)}
                            title="mark done"
                          >
                            <Check className="h-2.5 w-2.5 text-[hsl(var(--success))]" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Prompt preview */}
                  <p className="mt-1 pl-7 text-[10px] text-[hsl(var(--muted))] line-clamp-1">
                    {step.prompt}
                  </p>

                  {/* Dependencies */}
                  {step.dependsOn?.length ? (
                    <p className="mt-0.5 pl-7 text-[9px] text-[hsl(var(--muted))]">
                      ← {step.dependsOn.map((d) => d + 1).join(", ")}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
