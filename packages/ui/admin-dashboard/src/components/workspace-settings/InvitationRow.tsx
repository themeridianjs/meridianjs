import { useState } from "react"
import {
  useRevokeInvitation,
  useResendInvitation,
  type Invitation,
} from "@/api/hooks/useWorkspaces"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { format } from "date-fns"
import { Link2, RotateCw, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CopyButton } from "./CopyButton"

export function InvitationRow({ invitation, workspaceId }: { invitation: Invitation; workspaceId: string }) {
  const revoke = useRevokeInvitation(workspaceId)
  const resend = useResendInvitation(workspaceId)
  const [resendOpen, setResendOpen] = useState(false)
  const inviteUrl = `${window.location.origin}/invite/${invitation.token}`

  return (
    <div className="px-6 py-3.5 hover:bg-[#f9fafb] dark:hover:bg-muted/30 transition-colors group">
      {/* Desktop: single row */}
      <div className="hidden md:flex items-center gap-3">
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {invitation.email ?? "Shareable link"}
            </p>
            <span className={cn(
              "inline-flex items-center text-[11px] px-1.5 py-0.5 rounded font-medium",
              invitation.role === "super-admin"
                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
                : invitation.role === "admin"
                  ? "bg-indigo/10 text-indigo"
                  : "bg-muted text-muted-foreground"
            )}>
              {invitation.role === "super-admin" ? "Super Admin" : invitation.role === "admin" ? "Admin" : "Member"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[280px]">
              {inviteUrl}
            </span>
            <CopyButton value={inviteUrl} />
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            {format(new Date(invitation.created_at), "MMM d")}
          </span>
          {invitation.email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setResendOpen(true)}
                  disabled={resend.isPending}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <RotateCw className={cn("h-3.5 w-3.5", resend.isPending && "animate-spin")} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Resend invite</TooltipContent>
            </Tooltip>
          )}
          <button
            onClick={() =>
              revoke.mutate(invitation.id, {
                onSuccess: () => toast.success("Invitation revoked"),
                onError: () => toast.error("Failed to revoke"),
              })
            }
            disabled={revoke.isPending}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive disabled:opacity-50"
            title="Revoke invitation"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile: two rows */}
      <div className="md:hidden space-y-2">
        {/* Row 1: avatar + email + role badge + actions */}
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {invitation.email ?? "Shareable link"}
            </p>
            <span className={cn(
              "inline-flex items-center text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0",
              invitation.role === "super-admin"
                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
                : invitation.role === "admin"
                  ? "bg-indigo/10 text-indigo"
                  : "bg-muted text-muted-foreground"
            )}>
              {invitation.role === "super-admin" ? "Super Admin" : invitation.role === "admin" ? "Admin" : "Member"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {invitation.email && (
              <button
                onClick={() => setResendOpen(true)}
                disabled={resend.isPending}
                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <RotateCw className={cn("h-3.5 w-3.5", resend.isPending && "animate-spin")} />
              </button>
            )}
            <button
              onClick={() =>
                revoke.mutate(invitation.id, {
                  onSuccess: () => toast.success("Invitation revoked"),
                  onError: () => toast.error("Failed to revoke"),
                })
              }
              disabled={revoke.isPending}
              className="text-muted-foreground hover:text-destructive disabled:opacity-50"
              title="Revoke invitation"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: invite URL + date */}
        <div className="flex items-center gap-2 pl-10">
          <span className="text-xs font-mono text-muted-foreground truncate flex-1 min-w-0">
            {inviteUrl}
          </span>
          <CopyButton value={inviteUrl} />
          <span className="text-[11px] text-muted-foreground shrink-0">
            {format(new Date(invitation.created_at), "MMM d")}
          </span>
        </div>
      </div>

      <ConfirmDialog
        open={resendOpen}
        onClose={() => setResendOpen(false)}
        onConfirm={() =>
          resend.mutate(invitation.id, {
            onSuccess: () => { toast.success("Invitation resent"); setResendOpen(false) },
            onError: () => toast.error("Failed to resend invitation"),
          })
        }
        title="Resend invitation?"
        description={`A new invitation email will be sent to ${invitation.email}.`}
        confirmLabel="Resend"
        loading={resend.isPending}
      />
    </div>
  )
}
