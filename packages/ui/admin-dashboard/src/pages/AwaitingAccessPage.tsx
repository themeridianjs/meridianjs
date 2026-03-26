import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/stores/auth"
import {
  useWorkspaces,
  useSearchWorkspaces,
  useRequestWorkspaceAccess,
  useMyWorkspaceAccessRequests,
  useCancelWorkspaceAccessRequest,
  type WorkspaceSearchResult,
} from "@/api/hooks/useWorkspaces"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { AppLogo } from "@/components/AppLogo"
import { getAppName } from "@/lib/branding"
import { Building2, Plus, Search, CheckCircle2, ChevronRight, Clock, X } from "lucide-react"
import { toast } from "sonner"
import { createUserEventSource } from "@/lib/sse"
import { cn } from "@/lib/utils"

export function AwaitingAccessPage() {
  const { token, logout, setWorkspace } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Load user's own pending requests on mount — persists across refreshes
  const { data: myRequests = [] } = useMyWorkspaceAccessRequests()
  const cancelRequest = useCancelWorkspaceAccessRequest()

  // SSE: listen for real-time access request approval (instant redirect)
  useEffect(() => {
    if (!token) return
    const es = createUserEventSource(token)

    es.addEventListener("workspace.access_request_resolved", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data ?? "{}")
        if (data.action === "approve") {
          // Invalidate and refetch workspaces — the existing effect handles the redirect
          queryClient.invalidateQueries({ queryKey: ["workspaces"] })
          queryClient.invalidateQueries({ queryKey: ["my-access-requests"] })
        }
      } catch { /* ignore parse errors */ }
    })

    es.onerror = () => { /* EventSource auto-reconnects */ }

    return () => es.close()
  }, [token, queryClient])

  // Always keep workspaces query enabled so SSE invalidation triggers a refetch.
  // Poll as fallback (every 60s) when there are pending requests.
  const hasPendingRequests = myRequests.length > 0
  const { data: myWorkspaces } = useWorkspaces({ refetchInterval: hasPendingRequests ? 60_000 : false })
  useEffect(() => {
    if (myWorkspaces && myWorkspaces.length > 0) {
      const w = myWorkspaces[0]
      setWorkspace({ id: w.id, name: w.name, slug: w.slug, logo_url: w.logo_url ?? null })
      navigate(`/${w.slug}/projects`, { replace: true })
    }
  }, [myWorkspaces])

  // ── Workspace search state ──────────────────────────────────────────────────
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<WorkspaceSearchResult | null>(null)
  const [requestSent, setRequestSent] = useState(false)
  const [confirmWorkspace, setConfirmWorkspace] = useState<WorkspaceSearchResult | null>(null)
  const [confirmMessage, setConfirmMessage] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 250)
  const { data: searchResults = [] } = useSearchWorkspaces(debouncedQuery)
  const requestAccess = useRequestWorkspaceAccess()

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  const handleSelect = (ws: WorkspaceSearchResult) => {
    setIsOpen(false)
    if (!ws.is_member && !ws.has_pending_request) {
      setConfirmWorkspace(ws)
      setConfirmMessage("")
      return
    }
    setSelected(ws)
    setQuery(ws.name)
    setRequestSent(ws.has_pending_request)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setSelected(null)
    setRequestSent(false)
    setIsOpen(true)
  }

  const handleConfirmRequest = () => {
    if (!confirmWorkspace) return
    requestAccess.mutate(
      { workspaceId: confirmWorkspace.id, message: confirmMessage.trim() || undefined },
      {
        onSuccess: () => {
          setConfirmWorkspace(null)
          setSelected(confirmWorkspace)
          setQuery(confirmWorkspace.name)
          setRequestSent(true)
        },
        onError: (err: any) => {
          toast.error(err.message ?? "Failed to send request")
          setConfirmWorkspace(null)
        },
      }
    )
  }

  const handleCancelRequest = (workspaceId: string, requestId: string, workspaceName: string | null) => {
    cancelRequest.mutate(
      { workspaceId, requestId },
      {
        onSuccess: () => {
          toast.success(`Request to ${workspaceName ?? "workspace"} cancelled`)
          // If selected workspace was this one, reset search state
          if (selected?.id === workspaceId) {
            setSelected(null)
            setQuery("")
            setRequestSent(false)
          }
        },
        onError: () => toast.error("Failed to cancel request"),
      }
    )
  }

  const visibleResults = searchResults.filter((ws) =>
    ws.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Logo + header */}
        <div className="flex flex-col items-center gap-4">
          <AppLogo />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">Welcome to {getAppName()}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              You haven't been assigned to a workspace yet. Create one or request access to an existing workspace.
            </p>
          </div>
        </div>

        {/* Pending requests section — shown when user has submitted requests */}
        {myRequests.length > 0 && (
          <div className="bg-white dark:bg-card border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-sm font-medium">Pending access requests</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Waiting for admin approval. You'll be redirected automatically once approved.
            </p>
            <div className="space-y-2">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-amber-50 dark:bg-amber-950/20 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {req.workspace_name ?? req.workspace_id}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    disabled={cancelRequest.isPending}
                    onClick={() => handleCancelRequest(req.workspace_id, req.id, req.workspace_name)}
                    title="Cancel request"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create workspace */}
        <div className="bg-white dark:bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-medium">Create a new workspace</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Start fresh with your own workspace. You'll be the admin.
          </p>
          <Button
            size="sm"
            className="w-full"
            onClick={() => navigate("/setup")}
          >
            Create workspace
          </Button>
        </div>

        {/* Search + request access */}
        <div className="bg-white dark:bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Join an existing workspace</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Search for a public workspace and request access.
          </p>

          {/* Combobox */}
          <div className="relative">
            <Input
              ref={inputRef}
              placeholder="Search workspaces..."
              value={query}
              onChange={handleInputChange}
              onFocus={() => setIsOpen(true)}
              className="bg-white dark:bg-card h-9 text-sm"
            />
            {isOpen && visibleResults.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 mt-1 w-full bg-white dark:bg-card border border-border rounded-md shadow-md overflow-hidden max-h-48 overflow-y-auto"
              >
                {visibleResults.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left",
                      selected?.id === ws.id && "bg-accent"
                    )}
                    onClick={() => handleSelect(ws)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {ws.is_member && (
                      <span className="text-xs text-emerald-600 shrink-0 ml-2">Member</span>
                    )}
                    {!ws.is_member && ws.has_pending_request && (
                      <span className="text-xs text-amber-600 shrink-0 ml-2">Pending</span>
                    )}
                    {!ws.is_member && !ws.has_pending_request && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected workspace status */}
          {selected && selected.is_member && (
            <div className="pt-1">
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                You're already a member of this workspace.
              </p>
            </div>
          )}

          {(requestSent || (selected && selected.has_pending_request)) && (
            <div className="flex items-center gap-2 text-sm text-amber-600 pt-1">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Request sent! Waiting for admin approval.</span>
            </div>
          )}
        </div>

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={logout}>
          Sign out
        </Button>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmWorkspace} onOpenChange={(open) => { if (!open) setConfirmWorkspace(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request access to {confirmWorkspace?.name}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              A request will be sent to the workspace admins. You'll be notified once it's approved.
            </p>
            <Input
              placeholder="Optional message to admins..."
              value={confirmMessage}
              onChange={(e) => setConfirmMessage(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmWorkspace(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={requestAccess.isPending} onClick={handleConfirmRequest}>
              {requestAccess.isPending ? "Sending..." : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
