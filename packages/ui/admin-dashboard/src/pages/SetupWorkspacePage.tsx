import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useWorkspaces, useCreateWorkspace, useSearchWorkspaces, useRequestWorkspaceAccess } from "@/api/hooks/useWorkspaces"
import { useAuth } from "@/stores/auth"
import type { WorkspaceRef } from "@/stores/auth"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AppLogo } from "@/components/AppLogo"
import { getAppName } from "@/lib/branding"
import { Lock, AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import type { ApiError } from "@/api/client"
import { cn } from "@/lib/utils"

// Generate slug the same way the backend does
function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

interface ConflictWorkspace {
  id: string
  name: string
  slug: string
}

export function SetupWorkspacePage() {
  const [name, setName] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [conflictWorkspace, setConflictWorkspace] = useState<ConflictWorkspace | null>(null)
  const [requestSent, setRequestSent] = useState(false)
  const navigate = useNavigate()
  const { setWorkspace } = useAuth()

  // Poll for access approval after request is sent
  const { data: myWorkspaces } = useWorkspaces(requestSent ? { refetchInterval: 15_000 } : false)
  useEffect(() => {
    if (!requestSent) return
    if (myWorkspaces && myWorkspaces.length > 0) {
      const w = myWorkspaces[0]
      setWorkspace({ id: w.id, name: w.name, slug: w.slug, logo_url: w.logo_url ?? null })
      navigate(`/${w.slug}/projects`, { replace: true })
    }
  }, [myWorkspaces, requestSent])
  const createWorkspace = useCreateWorkspace()
  const requestAccess = useRequestWorkspaceAccess()

  // Live duplicate check
  const debouncedName = useDebounce(name, 300)
  const { data: searchResults = [] } = useSearchWorkspaces(debouncedName)

  // Check if any public workspace has the same slug as the typed name
  const typedSlug = toSlug(debouncedName)
  const liveConflict = debouncedName.trim().length > 0
    ? searchResults.find((w) => toSlug(w.name) === typedSlug) ?? null
    : null

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    setConflictWorkspace(null)
    setRequestSent(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createWorkspace.mutate(
      { name: name.trim(), is_private: isPrivate },
      {
        onSuccess: (data) => {
          const w: WorkspaceRef = { id: data.workspace.id, name: data.workspace.name, slug: data.workspace.slug }
          setWorkspace(w)
          navigate(`/${w.slug}/projects`, { replace: true })
        },
        onError: (err) => {
          const apiErr = err as ApiError
          if (apiErr.status === 409) {
            const ws = (apiErr.data as any)?.error?.workspace as ConflictWorkspace | undefined
            if (ws) {
              setConflictWorkspace(ws)
              return
            }
          }
          toast.error(apiErr.message ?? "Failed to create workspace")
        },
      }
    )
  }

  const handleRequestAccess = (ws: ConflictWorkspace) => {
    requestAccess.mutate(
      { workspaceId: ws.id },
      {
        onSuccess: () => setRequestSent(true),
        onError: (err: any) => toast.error(err.message ?? "Failed to send request"),
      }
    )
  }

  // Effective conflict (live warning takes precedence, then submit-time conflict)
  const displayConflict = liveConflict
    ? { id: liveConflict.id, name: liveConflict.name, slug: liveConflict.slug }
    : conflictWorkspace

  return (
    <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <AppLogo />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">Create your {getAppName()} workspace</h1>
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
              onChange={handleNameChange}
              autoFocus
              required
              className={cn(
                "bg-white dark:bg-card h-10",
                displayConflict && !requestSent && "border-amber-400 focus-visible:ring-amber-300"
              )}
            />
            <p className="text-xs text-muted-foreground px-0.5">
              You can rename it later from settings.
            </p>
          </div>

          {/* Conflict warning */}
          {displayConflict && !requestSent && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2.5 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  A workspace named <strong>{displayConflict.name}</strong> already exists.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/30"
                disabled={requestAccess.isPending}
                onClick={() => handleRequestAccess(displayConflict)}
              >
                {requestAccess.isPending ? "Sending request..." : `Request access to ${displayConflict.name}`}
              </Button>
            </div>
          )}

          {/* Request sent confirmation */}
          {requestSent && displayConflict && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 px-3 py-2.5 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                Request sent to <strong>{displayConflict.name}</strong>. Admins will review it shortly.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2.5 px-0.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="size-4 rounded border-border accent-indigo-600"
            />
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">Private workspace</span>
            </div>
            <span className="text-xs text-muted-foreground ml-auto">Only visible to members</span>
          </label>
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
