import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Building2, Clock, X, ArrowLeft, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  useSearchWorkspaces,
  useRequestWorkspaceAccess,
  useCancelWorkspaceAccessRequest,
  useMyWorkspaceAccessRequests,
  useWorkspaces,
} from "@/api/hooks/useWorkspaces"
import { useAuth } from "@/stores/auth"
import { AppLogo } from "@/components/AppLogo"
import { ApiError } from "@/api/client"
import { createUserEventSource } from "@/lib/sse"
import { toast } from "sonner"

export function RequestWorkspaceAccessPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { token, setWorkspace } = useAuth()
  const queryClient = useQueryClient()

  const { data: searchResults = [], isLoading: searchLoading } =
    useSearchWorkspaces(slug ?? "", { enabled: !!slug })

  const workspace = searchResults.find((w) => w.slug === slug) ?? null
  const workspaceFound = !searchLoading && workspace !== null
  const workspaceNotFound = !searchLoading && workspace === null

  const { data: myRequests = [] } = useMyWorkspaceAccessRequests()
  const existingRequest = workspace
    ? myRequests.find((r) => r.workspace_id === workspace.id) ?? null
    : null

  const [isPending, setIsPending] = useState(false)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (existingRequest) {
      setIsPending(true)
      setPendingRequestId(existingRequest.id)
    }
  }, [existingRequest?.id])

  const requestAccess = useRequestWorkspaceAccess()
  const cancelRequest = useCancelWorkspaceAccessRequest()

  const { data: myWorkspaces } = useWorkspaces({
    refetchInterval: isPending ? 60_000 : false,
  })

  useEffect(() => {
    if (myWorkspaces && myWorkspaces.length > 0 && isPending) {
      const w = myWorkspaces[0]
      setWorkspace({ id: w.id, name: w.name, slug: w.slug, logo_url: w.logo_url ?? null })
      navigate(`/${w.slug}/projects`, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myWorkspaces])

  useEffect(() => {
    if (!token) return
    const es = createUserEventSource(token)
    es.addEventListener("workspace.access_request_resolved", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data ?? "{}")
        if (data.action === "approve") {
          queryClient.invalidateQueries({ queryKey: ["workspaces"] })
          queryClient.invalidateQueries({ queryKey: ["workspaces", "my-access-requests"] })
        }
      } catch { /* ignore */ }
    })
    es.onerror = () => {}
    return () => es.close()
  }, [token, queryClient])

  const handleRequest = () => {
    if (!workspace) return
    requestAccess.mutate(
      { workspaceId: workspace.id, message: message.trim() || undefined },
      {
        onSuccess: (data) => {
          setIsPending(true)
          setPendingRequestId(data.access_request.id)
          queryClient.invalidateQueries({ queryKey: ["workspaces", "my-access-requests"] })
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            const existing = myRequests.find((r) => r.workspace_id === workspace.id)
            setIsPending(true)
            setPendingRequestId(existing?.id ?? null)
          } else {
            toast.error(err instanceof Error ? err.message : "Failed to send request")
          }
        },
      }
    )
  }

  const handleCancel = () => {
    if (!workspace || !pendingRequestId) return
    cancelRequest.mutate(
      { workspaceId: workspace.id, requestId: pendingRequestId },
      {
        onSuccess: () => {
          setIsPending(false)
          setPendingRequestId(null)
          setMessage("")
          toast.success("Request cancelled")
        },
        onError: () => toast.error("Failed to cancel request"),
      }
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] space-y-6">

        <div className="flex flex-col items-center gap-4">
          <AppLogo />
        </div>

        {searchLoading && (
          <div className="bg-white dark:bg-card border border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">Looking up workspace...</p>
          </div>
        )}

        {workspaceNotFound && (
          <div className="bg-white dark:bg-card border border-border rounded-lg p-6 space-y-3 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Workspace not found</h1>
              <p className="text-sm text-muted-foreground mt-1">
                "{slug}" doesn't exist or is private. Check the URL or ask for an invite link.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/">Go to my workspaces</Link>
            </Button>
          </div>
        )}

        {workspaceFound && (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{workspace.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  You don't have access to this workspace.
                </p>
              </div>
            </div>

            {workspace.is_member && (
              <div className="bg-white dark:bg-card border border-border rounded-lg p-4 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  You're already a member of this workspace.
                </p>
                <Button asChild size="sm" className="w-full">
                  <Link to={`/${workspace.slug}/projects`}>Go to workspace</Link>
                </Button>
              </div>
            )}

            {!workspace.is_member && isPending && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Request pending
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your request is waiting for admin approval. You'll be redirected automatically once approved.
                </p>
                {pendingRequestId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={cancelRequest.isPending}
                    onClick={handleCancel}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    {cancelRequest.isPending ? "Cancelling..." : "Cancel request"}
                  </Button>
                )}
              </div>
            )}

            {!workspace.is_member && !isPending && (
              <div className="bg-white dark:bg-card border border-border rounded-lg p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Send a request to the workspace admins.
                </p>
                <Textarea
                  placeholder="Optional message to admins..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="resize-none text-sm h-20"
                />
                <Button
                  className="w-full"
                  disabled={requestAccess.isPending}
                  onClick={handleRequest}
                >
                  {requestAccess.isPending ? "Sending..." : "Request access"}
                </Button>
              </div>
            )}

            <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
              <Link to="/">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                My workspaces
              </Link>
            </Button>
          </>
        )}

      </div>
    </div>
  )
}
