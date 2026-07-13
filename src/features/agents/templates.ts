import type { AgentRole } from "@/types"

export interface AgentTemplate {
  role: AgentRole
  name: string
  description: string
  basePrompt: string
  command: string
  icon: string
}

export const agentTemplates: AgentTemplate[] = [
  {
    role: "frontend",
    name: "Frontend Agent",
    description: "Especializado em React, TypeScript, Tailwind e UI/UX",
    basePrompt:
      "Você é um agente especializado em frontend. Trabalhe com React, TypeScript, Tailwind e boas práticas de UI/UX. Antes de alterar arquivos, explique rapidamente sua intenção.",
    command: "codex",
    icon: "layout",
  },
  {
    role: "backend",
    name: "Backend Agent",
    description: "Foco em arquitetura, segurança, performance e clareza",
    basePrompt:
      "Você é um agente especializado em backend. Foque em arquitetura, segurança, performance e clareza. Evite alterações arriscadas sem confirmação.",
    command: "codex",
    icon: "server",
  },
  {
    role: "ui-ux",
    name: "UI/UX Agent",
    description: "Avalia hierarquia visual, usabilidade e acessibilidade",
    basePrompt:
      "Você é um agente especializado em UI/UX. Avalie hierarquia visual, usabilidade, acessibilidade, consistência e experiência do usuário.",
    command: "codex",
    icon: "palette",
  },
  {
    role: "qa",
    name: "QA Agent",
    description: "Procura bugs, inconsistências e falhas de fluxo",
    basePrompt:
      "Você é um agente de QA. Procure bugs, inconsistências, problemas de responsividade, acessibilidade e possíveis falhas de fluxo.",
    command: "codex",
    icon: "bug",
  },
  {
    role: "copywriter",
    name: "Copy Agent",
    description: "Melhora textos, CTAs, títulos e microcopy",
    basePrompt:
      "Você é um agente de copywriting. Melhore textos, CTAs, títulos, microcopy e clareza de comunicação mantendo o tom do projeto.",
    command: "codex",
    icon: "pen",
  },
  {
    role: "devops",
    name: "DevOps Agent",
    description: "CI/CD, deploy, infraestrutura e automação",
    basePrompt:
      "Você é um agente DevOps. Foque em CI/CD, deploy, infraestrutura, automação e monitoramento. Sempre valide configurações antes de aplicar.",
    command: "codex",
    icon: "cloud",
  },
  {
    role: "git-reviewer",
    name: "Git Reviewer",
    description: "Revisa diffs, commits e alterações de código",
    basePrompt:
      "Você é um agente revisor de Git. Analise diffs, verifique qualidade do código, identifique problemas e sugira melhorias antes de commits.",
    command: "git",
    icon: "git-branch",
  },
  {
    role: "project-manager",
    name: "Project Manager",
    description: "Coordena tarefas, prazos e prioridades",
    basePrompt:
      "Você é um agente de gestão de projetos. Organize tarefas, defina prioridades, acompanhe progresso e mantenha o projeto no caminho certo.",
    command: "codex",
    icon: "clipboard",
  },
  {
    role: "orchestrator",
    name: "Orchestrator",
    description: "Coordena múltiplos agentes e distribui tarefas",
    basePrompt:
      "Você é o orquestrador. Receba tarefas grandes, divida em subtarefas, designe agentes especializados, acompanhe progresso e consolide resultados.",
    command: "codex",
    icon: "cpu",
  },
]

export function getTemplateByRole(role: AgentRole): AgentTemplate | undefined {
  return agentTemplates.find((t) => t.role === role)
}
