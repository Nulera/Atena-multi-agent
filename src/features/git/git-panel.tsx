import { useState, useCallback, useEffect, type FormEvent } from "react"
import {
  AlertTriangle,
  CloudDownload,
  CloudUpload,
  Copy,
  FileText,
  GitBranch,
  GitCommit,
  Link2,
  Loader2,
  RefreshCw,
  Settings2,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  gitCommitAll,
  gitDiff,
  gitInit,
  gitPull,
  gitPush,
  gitSetIdentity,
  gitSetRemote,
  gitStatus,
  type GitFile,
  type GitStatus,
} from "@/lib/git"
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function GitPanel({ workspacePath, onBranchChange }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null)
  const [diff, setDiff] = useState("")
  const [loading, setLoading] = useState(true)
  const [diffLoading, setDiffLoading] = useState(false)
  const [operation, setOperation] = useState<string | null>(null)
  const [identityOpen, setIdentityOpen] = useState(false)
  const [remoteOpen, setRemoteOpen] = useState(false)
  const [commitOpen, setCommitOpen] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [remoteUrl, setRemoteUrl] = useState("")
  const [commitMessage, setCommitMessage] = useState("")
  const { toast } = useToast()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const nextStatus = await gitStatus(workspacePath)
      setStatus(nextStatus)
      onBranchChange?.(nextStatus.branch)
    } catch (error) {
      toast({
        title: "Could not read Git status",
        description: errorMessage(error),
        variant: "danger",
      })
    } finally {
      setLoading(false)
    }
  }, [workspacePath, onBranchChange, toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  const runOperation = useCallback(
    async (
      name: string,
      action: () => Promise<unknown>,
      successTitle: string,
      afterSuccess?: () => void
    ) => {
      setOperation(name)
      try {
        await action()
        toast({ title: successTitle, variant: "success" })
        afterSuccess?.()
        await refresh()
      } catch (error) {
        toast({
          title: "Git operation failed",
          description: errorMessage(error),
          variant: "danger",
        })
      } finally {
        setOperation(null)
      }
    },
    [refresh, toast]
  )

  const loadDiff = useCallback(
    async (file: GitFile) => {
      setDiffLoading(true)
      try {
        setDiff(await gitDiff(workspacePath, file.path))
      } catch (error) {
        setDiff(`error: ${errorMessage(error)}`)
      } finally {
        setDiffLoading(false)
      }
    },
    [workspacePath]
  )

  const openIdentity = () => {
    setUserName(status?.userName ?? "")
    setUserEmail(status?.userEmail ?? "")
    setIdentityOpen(true)
  }

  const openRemote = () => {
    setRemoteUrl(status?.remoteUrl ?? "")
    setRemoteOpen(true)
  }

  const saveIdentity = (event: FormEvent) => {
    event.preventDefault()
    runOperation(
      "identity",
      () => gitSetIdentity(workspacePath, userName, userEmail),
      "Git identity saved",
      () => setIdentityOpen(false)
    )
  }

  const saveRemote = (event: FormEvent) => {
    event.preventDefault()
    runOperation(
      "remote",
      () => gitSetRemote(workspacePath, remoteUrl),
      "Origin connected",
      () => setRemoteOpen(false)
    )
  }

  const createCommit = (event: FormEvent) => {
    event.preventDefault()
    runOperation(
      "commit",
      () => gitCommitAll(workspacePath, commitMessage),
      "Commit created",
      () => {
        setCommitOpen(false)
        setCommitMessage("")
        setSelectedFile(null)
        setDiff("")
      }
    )
  }

  const confirmPush = () => {
    runOperation(
      "push",
      () => gitPush(workspacePath),
      "Changes pushed",
      () => setPushOpen(false)
    )
  }

  const copyDiff = useCallback(() => {
    navigator.clipboard.writeText(diff)
    toast({ title: "Diff copied", variant: "success" })
  }, [diff, toast])

  if (loading && !status) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[11px] text-[hsl(var(--muted))]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        reading Git repository
      </div>
    )
  }

  if (!status?.isRepo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--panel-elevated))]">
          <GitBranch className="h-4 w-4 text-[hsl(var(--muted))]" />
        </div>
        {status?.gitAvailable ? (
          <>
            <div>
              <p className="text-xs font-medium">No Git repository yet</p>
              <p className="mt-1 max-w-sm text-[10px] leading-relaxed text-[hsl(var(--muted))]">
                Initialize this project to track changes. You can connect GitHub after that.
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              disabled={operation !== null}
              onClick={() =>
                runOperation(
                  "init",
                  () => gitInit(workspacePath),
                  "Git repository initialized"
                )
              }
            >
              {operation === "init" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <GitBranch className="h-3 w-3" />
              )}
              initialize repository
            </Button>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium">Git is not installed</p>
              <p className="mt-1 max-w-sm text-[10px] leading-relaxed text-[hsl(var(--muted))]">
                Install Git for Windows, restart Atena, and this panel will connect automatically.
              </p>
            </div>
            <code className="border border-[hsl(var(--border))] bg-[hsl(var(--panel-elevated))] px-2.5 py-1.5 text-[10px]">
              winget install --id Git.Git -e
            </code>
          </>
        )}
      </div>
    )
  }

  const busy = operation !== null
  const hasIdentity = Boolean(status.userName && status.userEmail)
  const hasRemote = Boolean(status.remoteUrl)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex min-h-10 items-center gap-1 border-b border-[hsl(var(--border))] px-2">
        <div className="mr-1 flex min-w-0 items-center gap-1.5">
          <GitBranch className="h-3 w-3 shrink-0 text-[hsl(var(--accent))]" />
          <span className="max-w-28 truncate text-[11px] font-medium">
            {status.branch || "no commits"}
          </span>
          <span className="border border-[hsl(var(--border))] px-1.5 py-0.5 text-[9px] text-[hsl(var(--muted))]">
            {status.modifiedFiles.length} changed
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          disabled={busy || !hasRemote}
          onClick={() =>
            runOperation("pull", () => gitPull(workspacePath), "Repository updated")
          }
          title={hasRemote ? "Pull with fast-forward only" : "Connect an origin first"}
        >
          {operation === "pull" ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <CloudDownload className="h-2.5 w-2.5" />
          )}
          pull
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          disabled={busy || status.modifiedFiles.length === 0}
          onClick={() => setCommitOpen(true)}
        >
          <GitCommit className="h-2.5 w-2.5" />
          commit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          disabled={busy || !hasRemote}
          onClick={() => setPushOpen(true)}
          title={hasRemote ? "Push current branch" : "Connect an origin first"}
        >
          <CloudUpload className="h-2.5 w-2.5" />
          push
        </Button>

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6", !hasIdentity && "text-[hsl(var(--warning))]")}
            onClick={openIdentity}
            title={hasIdentity ? `${status.userName} <${status.userEmail}>` : "Configure Git identity"}
          >
            <UserRound className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6", !hasRemote && "text-[hsl(var(--warning))]")}
            onClick={openRemote}
            title={hasRemote ? status.remoteUrl : "Connect origin"}
          >
            {hasRemote ? <Link2 className="h-2.5 w-2.5" /> : <Settings2 className="h-2.5 w-2.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={refresh}
            disabled={busy || loading}
            title="refresh"
          >
            <RefreshCw className={cn("h-2.5 w-2.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {(!hasIdentity || !hasRemote) && (
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--warning)/0.06)] px-2.5 py-1.5 text-[10px]">
          <AlertTriangle className="h-3 w-3 shrink-0 text-[hsl(var(--warning))]" />
          <span className="text-[hsl(var(--muted-foreground))]">
            {!hasIdentity ? "Set your Git name and email." : "Connect an origin to pull and push."}
          </span>
          <Button
            variant="link"
            size="sm"
            className="ml-auto h-5 px-1 text-[10px]"
            onClick={!hasIdentity ? openIdentity : openRemote}
          >
            configure
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="flex w-56 flex-col border-r border-[hsl(var(--border))]">
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-2.5 text-[11px] text-[hsl(var(--muted))]">loading...</p>
            ) : status.modifiedFiles.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 p-4 text-center">
                <GitCommit className="h-5 w-5 text-[hsl(var(--muted))] opacity-40" />
                <p className="text-[11px]">clean</p>
                <p className="text-[10px] text-[hsl(var(--muted))]">no local changes</p>
              </div>
            ) : (
              <div className="p-1">
                {status.modifiedFiles.map((file) => {
                  const info = getStatusInfo(file.status)
                  return (
                    <button
                      key={file.path}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors",
                        selectedFile?.path === file.path
                          ? "bg-[hsl(var(--accent)/0.08)]"
                          : "hover:bg-[hsl(var(--panel-elevated))]"
                      )}
                      onClick={() => {
                        setSelectedFile(file)
                        loadDiff(file)
                      }}
                    >
                      <span className={cn("shrink-0 font-mono text-[10px]", info.color)}>
                        {info.label}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11px]">{file.path}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="space-y-1 border-t border-[hsl(var(--border))] p-2 text-[9px] text-[hsl(var(--muted))]">
            <p className="truncate" title={status.userEmail}>
              {hasIdentity ? status.userName : "identity not configured"}
            </p>
            <p className="truncate font-mono" title={status.remoteUrl}>
              {hasRemote ? status.remoteUrl : "origin not connected"}
            </p>
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
                    {diff || "No diff available. New files appear after the first commit."}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <FileText className="h-6 w-6 text-[hsl(var(--muted))] opacity-40" />
              <p className="text-xs">select a file</p>
              <p className="text-[10px] text-[hsl(var(--muted))]">
                choose a modified file to view its diff
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={identityOpen} onOpenChange={setIdentityOpen}>
        <DialogContent className="max-w-sm">
          <form onSubmit={saveIdentity}>
            <DialogHeader>
              <DialogTitle>Git identity</DialogTitle>
              <DialogDescription>
                Used as the author of commits in this project. This does not store your GitHub password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="block space-y-1 text-[10px] text-[hsl(var(--muted))]">
                name
                <Input
                  autoFocus
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label className="block space-y-1 text-[10px] text-[hsl(var(--muted))]">
                email
                <Input
                  type="email"
                  value={userEmail}
                  onChange={(event) => setUserEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
            </div>
            <DialogFooter>
              <Button type="button" size="sm" onClick={() => setIdentityOpen(false)}>
                cancel
              </Button>
              <Button type="submit" variant="default" size="sm" disabled={busy}>
                {operation === "identity" && <Loader2 className="h-3 w-3 animate-spin" />}
                save identity
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={remoteOpen} onOpenChange={setRemoteOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={saveRemote}>
            <DialogHeader>
              <DialogTitle>Connect remote repository</DialogTitle>
              <DialogDescription>
                Paste the HTTPS or SSH URL from GitHub. Authentication is handled securely by your installed Git.
              </DialogDescription>
            </DialogHeader>
            <label className="block space-y-1 text-[10px] text-[hsl(var(--muted))]">
              origin URL
              <Input
                autoFocus
                value={remoteUrl}
                onChange={(event) => setRemoteUrl(event.target.value)}
                placeholder="https://github.com/user/project.git"
              />
            </label>
            <DialogFooter>
              <Button type="button" size="sm" onClick={() => setRemoteOpen(false)}>
                cancel
              </Button>
              <Button type="submit" variant="default" size="sm" disabled={busy}>
                {operation === "remote" && <Loader2 className="h-3 w-3 animate-spin" />}
                connect origin
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={commitOpen} onOpenChange={setCommitOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={createCommit}>
            <DialogHeader>
              <DialogTitle>Create commit</DialogTitle>
              <DialogDescription>
                All {status.modifiedFiles.length} changed files will be added to this commit.
              </DialogDescription>
            </DialogHeader>
            <label className="block space-y-1 text-[10px] text-[hsl(var(--muted))]">
              message
              <Input
                autoFocus
                value={commitMessage}
                onChange={(event) => setCommitMessage(event.target.value)}
                placeholder="Describe what changed"
              />
            </label>
            <DialogFooter>
              <Button type="button" size="sm" onClick={() => setCommitOpen(false)}>
                cancel
              </Button>
              <Button type="submit" variant="default" size="sm" disabled={busy}>
                {operation === "commit" && <Loader2 className="h-3 w-3 animate-spin" />}
                create commit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pushOpen} onOpenChange={setPushOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Push source code?</DialogTitle>
            <DialogDescription>
              This sends the current branch and its commits to the remote repository.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 border border-[hsl(var(--border))] bg-[hsl(var(--panel-elevated))] p-2.5 text-[10px]">
            <div className="flex gap-2">
              <span className="w-14 shrink-0 text-[hsl(var(--muted))]">branch</span>
              <span className="font-mono">{status.branch || "HEAD"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-14 shrink-0 text-[hsl(var(--muted))]">remote</span>
              <span className="min-w-0 break-all font-mono">{status.remoteUrl}</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" size="sm" onClick={() => setPushOpen(false)}>
              cancel
            </Button>
            <Button type="button" variant="default" size="sm" disabled={busy} onClick={confirmPush}>
              {operation === "push" && <Loader2 className="h-3 w-3 animate-spin" />}
              push code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
