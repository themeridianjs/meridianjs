import {
  useWorkspaceAccessRequests,
  useHandleAccessRequest,
  type AccessRequest,
} from "@/api/hooks/useWorkspaces"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export function AccessRequestsTab({ workspaceId }: { workspaceId: string }) {
  const { data: requests = [], isLoading } = useWorkspaceAccessRequests(workspaceId)
  const handle = useHandleAccessRequest(workspaceId)

  const act = (requestId: string, action: "approve" | "deny") => {
    handle.mutate(
      { requestId, action },
      {
        onSuccess: () => toast.success(action === "approve" ? "Access approved" : "Request denied"),
        onError: (err: any) => toast.error(err.message ?? "Failed to update request"),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        No pending access requests.
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {requests.map((req: AccessRequest) => {
        const name = req.user
          ? [req.user.first_name, req.user.last_name].filter(Boolean).join(" ") || req.user.email
          : req.user_id
        return (
          <div key={req.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{name}</p>
              {req.user?.email && (
                <p className="text-xs text-muted-foreground truncate">{req.user.email}</p>
              )}
              {req.message && (
                <p className="text-xs text-muted-foreground mt-0.5 italic truncate">"{req.message}"</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={handle.isPending}
                onClick={() => act(req.id, "deny")}
              >
                Deny
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={handle.isPending}
                onClick={() => act(req.id, "approve")}
              >
                Approve
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
