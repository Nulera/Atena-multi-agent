import { useEffect, useState } from "react"
import { Download, RefreshCw } from "lucide-react"
import { check, type Update } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

export function UpdateManager() {
  const [update, setUpdate] = useState<Update | null>(null)
  const [installing, setInstalling] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (import.meta.env.DEV) return

    const timer = window.setTimeout(() => {
      check({ timeout: 15_000 })
        .then((available) => setUpdate(available))
        .catch((error) => {
          console.info("Update check unavailable:", error)
        })
    }, 2_500)

    return () => window.clearTimeout(timer)
  }, [])

  async function installUpdate() {
    if (!update || installing) return
    setInstalling(true)
    let downloaded = 0
    let total: number | undefined

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength
          setProgress(total ? 0 : null)
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength
          if (total)
            setProgress(Math.min(100, Math.round((downloaded / total) * 100)))
        } else if (event.event === "Finished") {
          setProgress(100)
        }
      })
      toast({
        title: "update installed",
        description: "restarting Atena...",
        variant: "success",
      })
      await relaunch()
    } catch (error) {
      setInstalling(false)
      toast({
        title: "update failed",
        description: String(error),
        variant: "danger",
      })
    }
  }

  return (
    <Dialog
      open={!!update}
      onOpenChange={(open) => {
        if (!open && !installing) setUpdate(null)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>update available</DialogTitle>
          <DialogDescription>
            Atena {update?.version} is ready to install.
          </DialogDescription>
        </DialogHeader>
        {update?.body && (
          <div className="max-h-40 overflow-auto border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2 text-[10px] text-[hsl(var(--muted-foreground))]">
            {update.body}
          </div>
        )}
        {installing && (
          <div className="space-y-1.5">
            <div className="h-1 overflow-hidden bg-[hsl(var(--border))]">
              <div
                className="h-full bg-[hsl(var(--accent))] transition-[width]"
                style={{ width: `${progress ?? 18}%` }}
              />
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
              {progress === null
                ? "downloading..."
                : `downloading... ${progress}%`}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            disabled={installing}
            onClick={() => setUpdate(null)}
          >
            later
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={installing}
            onClick={installUpdate}
          >
            {installing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {installing ? "installing" : "install and restart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
