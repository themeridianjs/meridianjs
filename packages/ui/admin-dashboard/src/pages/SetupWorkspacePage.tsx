import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useCreateWorkspace } from "@/api/hooks/useWorkspaces"
import { useAuth } from "@/stores/auth"
import type { WorkspaceRef } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function SetupWorkspacePage() {
  const [name, setName] = useState("")
  const navigate = useNavigate()
  const { setWorkspace } = useAuth()
  const createWorkspace = useCreateWorkspace()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createWorkspace.mutate(
      { name: name.trim() },
      {
        onSuccess: (data) => {
          const w: WorkspaceRef = { id: data.workspace.id, name: data.workspace.name, slug: data.workspace.slug }
          setWorkspace(w)
          navigate(`/${w.slug}/projects`, { replace: true })
        },
        onError: (err) => toast.error(err.message ?? "Failed to create workspace"),
      }
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="relative h-16 w-16 rounded-2xl bg-white dark:bg-card border border-border shadow-sm flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center">
              <div className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-background/60" />
              </div>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">Create your workspace</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              A workspace is where your team's projects and issues live.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Input
              placeholder="Workspace name (e.g. Acme Corp)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="bg-white dark:bg-card h-10"
            />
            <p className="text-xs text-muted-foreground px-0.5">
              You can rename it later from settings.
            </p>
          </div>
          <Button
            type="submit"
            className="w-full h-10 font-medium"
            disabled={!name.trim() || createWorkspace.isPending}
          >
            {createWorkspace.isPending ? "Creating workspace..." : "Create workspace"}
          </Button>
        </form>
      </div>
    </div>
  )
}
