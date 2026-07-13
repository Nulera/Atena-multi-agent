import { useState, useCallback, useEffect } from "react"
import {
  Settings as SettingsIcon,
  Palette,
  Terminal,
  Folder,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/lib/theme"
import { useToast } from "@/components/ui/toast"
import { getSetting, setSetting } from "@/lib/db"

export function SettingsPanel() {
  const { theme, themes, setTheme } = useTheme()
  const { toast } = useToast()
  const [editor, setEditor] = useState("code")
  const [shell, setShell] = useState("")
  const [codexPath, setCodexPath] = useState("")
  const [claudePath, setClaudePath] = useState("")
  const [opencodePath, setOpencodePath] = useState("")
  const [defaultFolder, setDefaultFolder] = useState("")
  const [logLimit, setLogLimit] = useState("1000")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setEditor((await getSetting("editor")) || "code")
        setShell((await getSetting("shell")) || "")
        setCodexPath((await getSetting("codex_path")) || "")
        setClaudePath((await getSetting("claude_path")) || "")
        setOpencodePath((await getSetting("opencode_path")) || "")
        setDefaultFolder((await getSetting("default_folder")) || "")
        setLogLimit((await getSetting("log_limit")) || "1000")
      } catch (err) {
        console.error("Failed to load settings:", err)
      }
    }
    load()
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await setSetting("editor", editor)
      await setSetting("shell", shell)
      await setSetting("codex_path", codexPath)
      await setSetting("claude_path", claudePath)
      await setSetting("opencode_path", opencodePath)
      await setSetting("default_folder", defaultFolder)
      await setSetting("log_limit", logLimit)
      toast({ title: "Configurações salvas", variant: "success" })
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: String(err),
        variant: "danger",
      })
    } finally {
      setSaving(false)
    }
  }, [
    editor,
    shell,
    codexPath,
    claudePath,
    opencodePath,
    defaultFolder,
    logLimit,
    toast,
  ])

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-[hsl(var(--accent))]" />
          <h2 className="text-lg font-semibold">Configurações</h2>
        </div>

        <Card className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <h3 className="text-sm font-medium">Aparência</h3>
          </div>
          <div className="space-y-2">
            <Label>Tema</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`rounded-[var(--radius-sm)] border p-3 text-left transition-colors cursor-pointer ${
                    theme.id === t.id
                      ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)]"
                      : "border-[hsl(var(--border))] hover:border-[hsl(var(--border-strong))]"
                  }`}
                >
                  <p className="text-xs font-medium">{t.name}</p>
                  <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {t.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <h3 className="text-sm font-medium">Ferramentas</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Editor padrão</Label>
              <Input
                placeholder="code, cursor, vim..."
                value={editor}
                onChange={(e) => setEditor(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Shell padrão</Label>
              <Input
                placeholder="powershell, cmd, bash, zsh..."
                value={shell}
                onChange={(e) => setShell(e.target.value)}
              />
            </div>
            <Separator />
            <div className="space-y-1">
              <Label>Caminho do Codex CLI</Label>
              <Input
                placeholder="codex"
                value={codexPath}
                onChange={(e) => setCodexPath(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Caminho do Claude Code</Label>
              <Input
                placeholder="claude"
                value={claudePath}
                onChange={(e) => setClaudePath(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Caminho do OpenCode</Label>
              <Input
                placeholder="opencode"
                value={opencodePath}
                onChange={(e) => setOpencodePath(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <h3 className="text-sm font-medium">Workspaces</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Pasta padrão de workspaces</Label>
              <Input
                placeholder="C:\projetos"
                value={defaultFolder}
                onChange={(e) => setDefaultFolder(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Limite de logs por sessão</Label>
              <Input
                type="number"
                placeholder="1000"
                value={logLimit}
                onChange={(e) => setLogLimit(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </div>
  )
}
