import { useState } from "react"
import { useParams, useLocation, Link } from "react-router-dom"
import { Lock, Clock, ArrowLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useRequestProjectAccess, useCancelProjectAccessRequest } from "@/api/hooks/useProjectAccess"
import { ApiError } from "@/api/client"
import { toast } from "sonner"

export function RequestProjectAccessPage() {
  const { projectKey, workspace: ws } = useParams<{ projectKey: string; workspace: string }>()
  const location = useLocation()
  const state = location.state as { projectId?: string; projectName?: string } | null

  const projectId = state?.projectId ?? null
  const projectName = state?.projectName ?? projectKey ?? "this project"

  const [message, setMessage] = useState("")
  const [isPending, setIsPending] = useState(false)

  const requestAccess = useRequestProjectAccess()
  const cancelRequest = useCancelProjectAccessRequest()

  const handleRequest = () => {
    if (!projectId) return
    requestAccess.mutate(
      { projectId, message: message.trim() || undefined },
      {
        onSuccess: () => setIsPending(true),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            setIsPending(true)
          } else {
            toast.error(err instanceof Error ? err.message : "Failed to send request")
          }
        },
      }
    )
  }

  const handleCancel = () => {
    if (!projectId) return
    cancelRequest.mutate(projectId, {
      onSuccess: () => {
        setIsPending(false)
        setMessage("")
        toast.success("Request cancelled")
      },
      onError: () => toast.error("Failed to cancel request"),
    })
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
      <div className="w-full max-w-[400px] space-y-6">

        <Link
          to={`/${ws}/projects`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to projects
        </Link>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{projectName}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              You don't have access to this project.
              {projectId ? " Request access from the project managers." : ""}
            </p>
          </div>
        </div>

        {!projectId && (
          <div className="bg-muted/40 border border-border rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Unable to load project details. This link may be incomplete.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to={`/${ws}/projects`}>Browse projects</Link>
            </Button>
          </div>
        )}

        {projectId && isPending && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Request pending
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your request has been sent to the project managers. You'll be notified when it's approved.
            </p>
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
          </div>
        )}

        {projectId && !isPending && (
          <div className="bg-white dark:bg-card border border-border rounded-lg p-4 space-y-3">
            <Textarea
              placeholder="Optional message to project managers..."
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

      </div>
    </div>
  )
}
