import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { agentTemplates, type AgentTemplate } from "./templates"
import { cn } from "@/lib/utils"
import type { Agent, AgentRole } from "@/types"

interface AgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  workspacePath: string
  agent?: Agent | null
  onSave: (data: {
    workspaceId: string
    name: string
    role: string
    description: string
    basePrompt: string
    command: string
    workingDirectory: string
  }) => void
}

export function AgentDialog({
  open,
  onOpenChange,
  workspaceId,
  workspacePath,
  agent,
  onSave,
}: AgentDialogProps) {
  const [name, setName] = useState("")
  const [role, setRole] = useState<AgentRole>("custom")
  const [description, setDescription] = useState("")
  const [basePrompt, setBasePrompt] = useState("")
  const [command, setCommand] = useState("")
  const [workingDirectory, setWorkingDirectory] = useState("")
  const [selectedTemplate, setSelectedTemplate] =
    useState<AgentTemplate | null>(null)

  useEffect(() => {
    if (agent) {
      setName(agent.name)
      setRole(agent.role as AgentRole)
      setDescription(agent.description)
      setBasePrompt(agent.basePrompt)
      setCommand(agent.command)
      setWorkingDirectory(agent.workingDirectory)
    } else {
      setName("")
      setRole("custom")
      setDescription("")
      setBasePrompt("")
      setCommand("")
      setWorkingDirectory(workspacePath)
      setSelectedTemplate(null)
    }
  }, [agent, open, workspacePath])

  function applyTemplate(template: AgentTemplate) {
    setSelectedTemplate(template)
    setRole(template.role)
    if (!name || name === selectedTemplate?.name) setName(template.name)
    if (!description) setDescription(template.description)
    if (!basePrompt) setBasePrompt(template.basePrompt)
    if (!command) setCommand(template.command)
  }

  function handleSave() {
    if (!name.trim()) return
    onSave({
      workspaceId,
      name: name.trim(),
      role,
      description: description.trim(),
      basePrompt: basePrompt.trim(),
      command: command.trim(),
      workingDirectory: workingDirectory.trim() || workspacePath,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{agent ? "Editar Agente" : "Criar Agente"}</DialogTitle>
          <DialogDescription>
            Configure um agente especializado para este workspace
          </DialogDescription>
        </DialogHeader>

        {!agent && (
          <div className="space-y-2">
            <Label>Templates</Label>
            <div className="grid grid-cols-3 gap-2">
              {agentTemplates.map((t) => (
                <button
                  key={t.role}
                  onClick={() => applyTemplate(t)}
                  className={cn(
                    "rounded-[var(--radius-sm)] border p-2 text-left text-xs transition-colors cursor-pointer",
                    selectedTemplate?.role === t.role
                      ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)]"
                      : "border-[hsl(var(--border))] hover:border-[hsl(var(--border-strong))]"
                  )}
                >
                  <p className="font-medium">{t.name}</p>
                  <p className="mt-0.5 text-[hsl(var(--muted-foreground))]">
                    {t.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="agent-name">Nome</Label>
            <Input
              id="agent-name"
              placeholder="Ex: Frontend Agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-role">Função</Label>
            <select
              id="agent-role"
              value={role}
              onChange={(e) => setRole(e.target.value as AgentRole)}
              className="flex h-9 w-full rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-3 py-1 text-sm text-[hsl(var(--foreground))] cursor-pointer"
            >
              {agentTemplates.map((t) => (
                <option key={t.role} value={t.role}>
                  {t.name}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-desc">Descrição</Label>
            <Input
              id="agent-desc"
              placeholder="Breve descrição do agente"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-prompt">Prompt Base</Label>
            <Textarea
              id="agent-prompt"
              placeholder="Instruções base para o agente..."
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="agent-command">Comando Padrão</Label>
              <Input
                id="agent-command"
                placeholder="Ex: codex, claude, opencode"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agent-dir">Diretório de Trabalho</Label>
              <Input
                id="agent-dir"
                placeholder="Caminho da pasta"
                value={workingDirectory}
                onChange={(e) => setWorkingDirectory(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {agent ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
