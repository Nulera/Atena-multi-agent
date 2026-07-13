import { useState, useCallback, useEffect } from "react"
import {
  GitBranch,
  GitCommit,
  FileText,
  Copy,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { gitStatus, gitDiff, type GitStatus, type GitFile } from "@/lib/git"
import { useToast } from "@/components/ui/toast"

interface GitPanelProps {
  workspacePath: string
  onBranchChange?: (branch: string) => void
}

const statusLabels: Record<string, { label: string; color: string }> = {
  M: { label: "M", color: "text-[hsl(var(--warning))]" },
  A: { label: "A", color: "text-[hsl(var(--success))]" },
  D: { label: "D", color: "text-[hsl(var(--danger))]" },
  R: { label: "R", color: "text-[hsl(var(--accent))]" },
  "?": { label: "?", color: "text-[hsl(var(--muted))]" },
  U: { label: "U", color: "text-[hsl(var(--danger))]" },
}

function getStatusInfo(status: string) {
  const code = status.replace(/\s/g, "").charAt(0) || "?"
  return statusLabels[code] ?? { label: status, color: "text-[hsl(var(--muted))]" }
}

export function GitPanel({ workspacePath, onBranchChange }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null)
  const [diff, setDiff] = useState("")
  const [loading, setLoading] = useState(true)
  const [diffLoading, setDiffLoading] = useState(false)
  const { toast } = useToast()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const s = await gitStatus(workspacePath)
      setStatus(s)
      onBranchChange?.(s.branch)
    } catch (err) {
      console.error("Git status error:", err)
    } finally {
      setLoading(false)
    }
  }, [workspacePath, onBranchChange])

  useEffect(() => {
    refresh()
  }, [refresh])

  const loadDiff = useCallback(
    async (file: GitFile) => {
      setDiffLoading(true)
      try {
        const d = await gitDiff(workspacePath, file.path)
        setDiff(d)
      } catch (err) {
        setDiff(`err: ${err}`)
      } finally {
        setDiffLoading(false)
      }
    },
    [workspacePath]
  )

  const handleSelectFile = useCallback(
    (file: GitFile) => {
      setSelectedFile(file)
      loadDiff(file)
    },
    [loadDiff]
  )

  const copyDiff = useCallback(() => {
    navigator.clipboard.writeText(diff)
    toast({ title: "diff copied", variant: "success" })
  }, [diff, toast])

  if (!loading && !status?.isRepo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <GitBranch className="h-6 w-6 text-[hsl(var(--muted))] opacity-40" />
        <p className="text-xs">not a git repo</p>
        <p className="text-[10px] text-[hsl(var(--muted))]">this workspace has no .git folder</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex w-56 flex-col border-r border-[hsl(var(--border))]">
        <div className="flex items-center gap-1.5 border-b border-[hsl(var(--border))] px-2.5 py-1.5">
          <GitBranch className="h-3 w-3 text-[hsl(var(--accent))]" />
          <span className="truncate text-[11px] font-medium">{status?.branch || "..."}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-5 w-5"
            onClick={refresh}
            title="refresh"
          >
            <RefreshCw className="h-2.5 w-2.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-2.5 text-[11px] text-[hsl(var(--muted))]">loading...</p>
          ) : status?.modifiedFiles.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 p-4 text-center">
              <GitCommit className="h-5 w-5 text-[hsl(var(--muted))] opacity-40" />
              <p className="text-[11px]">clean</p>
              <p className="text-[10px] text-[hsl(var(--muted))]">no changes</p>
            </div>
          ) : (
            <div className="space-y-0 p-1">
              {status?.modifiedFiles.map((file) => {
                const info = getStatusInfo(file.status)
                return (
                  <div
                    key={file.path}
                    className={cn(
                      "group flex cursor-pointer items-center gap-1.5 px-2 py-1 transition-colors",
                      selectedFile?.path === file.path
                        ? "bg-[hsl(var(--accent)/0.08)]"
                        : "hover:bg-[hsl(var(--panel-elevated))]"
                    )}
                    onClick={() => handleSelectFile(file)}
                  >
                    <span className={cn("shrink-0 text-[10px] font-mono", info.color)}>
                      {info.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px]">
                      {file.path}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedFile ? (
          <>
            <div className="flex items-center gap-1.5 border-b border-[hsl(var(--border))] px-2.5 py-1.5">
              <FileText className="h-3 w-3 text-[hsl(var(--muted))]" />
              <span className="truncate text-[11px] font-medium">{selectedFile.path}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 text-[10px]"
                onClick={copyDiff}
              >
                <Copy className="h-2.5 w-2.5" />
                copy
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {diffLoading ? (
                <p className="text-[11px] text-[hsl(var(--muted))]">loading diff...</p>
              ) : (
                <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-[hsl(var(--foreground))]">
                  {diff || "no changes"}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <FileText className="h-6 w-6 text-[hsl(var(--muted))] opacity-40" />
            <p className="text-xs">select a file</p>
            <p className="text-[10px] text-[hsl(var(--muted))]">choose a modified file to view diff</p>
          </div>
        )}
      </div>
    </div>
  )
}
