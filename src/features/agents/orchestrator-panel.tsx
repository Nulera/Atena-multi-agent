import { useState, useCallback } from "react"
import {
  Cpu,
  Play,
  Square,
  Check,
  Clock,
  Plus,
  RefreshCw,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  squadTemplates,
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
  workspacePath: string
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

export function OrchestratorPanel({ workspacePath }: OrchestratorPanelProps) {
  const [goal, setGoal] = useState("")
  const [plan, setPlan] = useState<OrchestrationPlan | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<SquadTemplate | null>(null)
  const [runningSteps, setRunningSteps] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const runningCount = plan?.steps.filter((s) => s.status === "running").length ?? 0
  const doneCount = plan?.steps.filter((s) => s.status === "completed").length ?? 0
  const totalCount = plan?.steps.length ?? 0

  const generatePlan = useCallback(() => {
    if (!goal.trim() || !selectedTemplate) return

    const steps: OrchestrationStep[] = selectedTemplate.steps.map((s) => ({
      ...s,
      id: `step-${Date.now()}-${s.order}`,
      status: s.dependsOn?.length ? "waiting" : "pending",
      resultSummary: undefined,
    }))

    setPlan({ goal: goal.trim(), steps })
    toast({ title: "plan generated", description: `${steps.length} steps`, variant: "success" })
  }, [goal, selectedTemplate, toast])

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
      return {
        ...prev,
        steps: prev.steps.map((s) =>
          s.id === stepId
            ? { ...s, status: "completed" }
            : s.status === "waiting"
            ? { ...s, status: "pending" }
            : s
        ),
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
                placeholder="ex: criar landing page para imobiliária com copy persuasiva, layout moderno, responsivo e SEO básico"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="min-h-[70px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted))]">
                squad template
              </label>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {squadTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={cn(
                      "border p-2.5 text-left transition-colors cursor-pointer",
                      selectedTemplate?.id === t.id
                        ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)]"
                        : "border-[hsl(var(--border))] hover:border-[hsl(var(--border-strong))]"
                    )}
                  >
                    <p className="text-xs font-medium">{t.name}</p>
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
                ))}
              </div>
            </div>

            <Button
              variant="default"
              size="md"
              onClick={generatePlan}
              disabled={!goal.trim() || !selectedTemplate}
              className="w-full"
            >
              <Plus className="h-3.5 w-3.5" />
              generate plan
            </Button>
          </div>
        ) : (
          /* Execution phase — queue of agents */
          <div className="mx-auto max-w-2xl space-y-1.5">
            {/* Goal */}
            <div className="border border-[hsl(var(--border))] bg-[hsl(var(--panel))] p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted))]">
                pedido
              </p>
              <p className="mt-0.5 text-xs">{plan.goal}</p>
            </div>

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
