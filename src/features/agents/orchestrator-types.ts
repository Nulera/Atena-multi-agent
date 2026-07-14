export type CliTool = "codex" | "claude" | "opencode" | "git" | "shell"

export interface OrchestrationStep {
  id: string
  order: number
  agentRole: string
  cliTool: CliTool
  title: string
  prompt: string
  status: "pending" | "running" | "waiting" | "completed" | "failed"
  dependsOn?: number[]
  resultSummary?: string
}

export interface OrchestrationPlan {
  id: string
  goal: string
  templateId?: string
  steps: OrchestrationStep[]
}

export type SquadTemplateStep = Omit<
  OrchestrationStep,
  "id" | "status" | "resultSummary"
>

export interface SquadTemplate {
  id: string
  name: string
  description: string
  steps: SquadTemplateStep[]
  builtIn?: boolean
}

export const defaultSquadTemplates: SquadTemplate[] = [
  {
    id: "dev",
    name: "Development Squad",
    description: "Frontend + Backend + QA + Git Review",
    builtIn: true,
    steps: [
      {
        order: 0,
        agentRole: "frontend",
        cliTool: "codex",
        title: "Implement frontend",
        prompt:
          "Implement the frontend components for this task. Follow existing patterns and style.",
      },
      {
        order: 1,
        agentRole: "backend",
        cliTool: "codex",
        title: "Implement backend",
        prompt:
          "Implement the backend logic for this task. Ensure security and performance.",
        dependsOn: [0],
      },
      {
        order: 2,
        agentRole: "qa",
        cliTool: "claude",
        title: "Test & review",
        prompt:
          "Review the implementation for bugs, edge cases, and write tests if needed.",
        dependsOn: [0, 1],
      },
      {
        order: 3,
        agentRole: "git-reviewer",
        cliTool: "opencode",
        title: "Git review",
        prompt: "Review all changes made. Check diff, code quality, and suggest improvements.",
        dependsOn: [2],
      },
    ],
  },
  {
    id: "design",
    name: "Design Squad",
    description: "UI/UX + Copy + Frontend + QA",
    builtIn: true,
    steps: [
      {
        order: 0,
        agentRole: "ui-ux",
        cliTool: "claude",
        title: "Design layout",
        prompt: "Design the visual layout, hierarchy, and UX flow for this task.",
      },
      {
        order: 1,
        agentRole: "copywriter",
        cliTool: "claude",
        title: "Write copy",
        prompt: "Write all text content, CTAs, and microcopy for this design.",
        dependsOn: [0],
      },
      {
        order: 2,
        agentRole: "frontend",
        cliTool: "codex",
        title: "Implement design",
        prompt: "Implement the design from the UI/UX and copy steps above.",
        dependsOn: [0, 1],
      },
      {
        order: 3,
        agentRole: "qa",
        cliTool: "opencode",
        title: "QA review",
        prompt: "Review the implementation for responsiveness and accessibility.",
        dependsOn: [2],
      },
    ],
  },
  {
    id: "debug",
    name: "Debug Squad",
    description: "Debugger + QA + Git Review",
    builtIn: true,
    steps: [
      {
        order: 0,
        agentRole: "backend",
        cliTool: "codex",
        title: "Investigate bug",
        prompt: "Investigate the reported issue. Find the root cause and propose a fix.",
      },
      {
        order: 1,
        agentRole: "qa",
        cliTool: "claude",
        title: "Write reproduction test",
        prompt: "Write a test that reproduces the bug before the fix is applied.",
        dependsOn: [0],
      },
      {
        order: 2,
        agentRole: "backend",
        cliTool: "codex",
        title: "Apply fix",
        prompt: "Apply the fix for the bug. Ensure the reproduction test now passes.",
        dependsOn: [0, 1],
      },
      {
        order: 3,
        agentRole: "git-reviewer",
        cliTool: "opencode",
        title: "Review fix",
        prompt: "Review the bug fix diff. Ensure no regressions.",
        dependsOn: [2],
      },
    ],
  },
  {
    id: "content",
    name: "Content Squad",
    description: "Copy + SEO + Review",
    builtIn: true,
    steps: [
      {
        order: 0,
        agentRole: "copywriter",
        cliTool: "claude",
        title: "Write content",
        prompt: "Write the main content for this task.",
      },
      {
        order: 1,
        agentRole: "copywriter",
        cliTool: "opencode",
        title: "SEO optimize",
        prompt: "Optimize the content for search engines. Add meta tags suggestions.",
        dependsOn: [0],
      },
      {
        order: 2,
        agentRole: "qa",
        cliTool: "codex",
        title: "Review content",
        prompt: "Review the final content for clarity, grammar, and tone.",
        dependsOn: [1],
      },
    ],
  },
]

export const cliToolLabels: Record<CliTool, string> = {
  codex: "codex",
  claude: "claude",
  opencode: "opencode",
  git: "git",
  shell: "shell",
}

export const cliToolColors: Record<CliTool, string> = {
  codex: "text-[hsl(var(--accent))]",
  claude: "text-[hsl(var(--warning))]",
  opencode: "text-[hsl(var(--success))]",
  git: "text-[hsl(var(--danger))]",
  shell: "text-[hsl(var(--muted-foreground))]",
}
