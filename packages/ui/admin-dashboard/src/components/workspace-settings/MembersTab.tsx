import { useState } from "react"
import {
  useInvitations,
  useWorkspaceMembers,
  useRemoveWorkspaceMember,
  type WorkspaceMember,
} from "@/api/hooks/useWorkspaces"
import { useRoles, useAssignUserRole } from "@/api/hooks/useRoles"
import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"
import {
  Users,
  Plus,
  MoreHorizontal,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { InvitationRow } from "./InvitationRow"

const WS_PAGE_SIZE = 20

export function MembersTab({ workspaceId, onInvite }: { workspaceId: string; onInvite: () => void }) {
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId)
  const { data: invitations, isLoading: invitationsLoading } = useInvitations(workspaceId)
  const removeMember = useRemoveWorkspaceMember(workspaceId)
  const assignUserRole = useAssignUserRole()
  const { data: appRoles } = useRoles()
  const { user } = useAuth()

  const [confirmRemove, setConfirmRemove] = useState<WorkspaceMember | null>(null)
  const [page, setPage] = useState(0)

  const pending = invitations?.filter((i) => i.status === "pending") ?? []

  return (
    <>
      {/* ── Current members ── */}
      <div className="px-6 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          Members
          {!membersLoading && members && (
            <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[11px] font-medium rounded-full">
              {members.length}
            </Badge>
          )}
        </span>
      </div>

      {membersLoading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3.5">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : !members?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">No members yet</p>
          <button
            onClick={onInvite}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Invite someone
          </button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {(members ?? []).slice(page * WS_PAGE_SIZE, (page + 1) * WS_PAGE_SIZE).map((m) => {
              const u = m.user
              const first = u?.first_name ?? ""
              const last = u?.last_name ?? ""
              const displayName = `${first} ${last}`.trim() || u?.email || "Unknown"
              const initials = (first[0] ?? last[0] ?? u?.email?.[0] ?? "U").toUpperCase()
              const isCurrentUser = u?.id === user?.id

              return (
                <div key={m.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#f9fafb] dark:hover:bg-muted/30 transition-colors group">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[11px] font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      {isCurrentUser && (
                        <span className="text-[11px] text-muted-foreground">(you)</span>
                      )}
                    </div>
                    {u?.email && (
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    )}
                  </div>

                  {/* Role select */}
                  {appRoles && appRoles.length > 0 && (
                    <Select
                      value={m.app_role_id ?? "none"}
                      onValueChange={(v) =>
                        assignUserRole.mutate(
                          { userId: m.user_id, appRoleId: v === "none" ? null : v },
                          {
                            onSuccess: () => toast.success("Custom role updated"),
                            onError: () => toast.error("Failed to update custom role"),
                          }
                        )
                      }
                    >
                      <SelectTrigger className="h-7 text-[11px] w-32 shrink-0">
                        <SelectValue placeholder="Custom role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">No custom role</span>
                        </SelectItem>
                        {appRoles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Actions */}
                  {!isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            fetch(`/admin/users/${m.user_id}/sessions`, {
                              method: "DELETE",
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem("meridian_token")}`,
                              },
                            })
                              .then(() => toast.success("Sessions revoked — user will be signed out"))
                              .catch(() => toast.error("Failed to revoke sessions"))
                          }}
                        >
                          Revoke sessions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setConfirmRemove(m)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })}
          </div>
          {(members?.length ?? 0) > WS_PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {page * WS_PAGE_SIZE + 1}–{Math.min((page + 1) * WS_PAGE_SIZE, members!.length)} of {members!.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums w-12 text-center">
                  {page + 1} / {Math.ceil(members!.length / WS_PAGE_SIZE)}
                </span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * WS_PAGE_SIZE >= members!.length}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Pending invitations ── */}
      <div className="px-6 py-2 border-t border-b border-border bg-muted/20 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          Pending invitations
          {!invitationsLoading && pending.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[11px] font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {pending.length}
            </Badge>
          )}
        </span>
        <button
          onClick={onInvite}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" />
          Invite
        </button>
      </div>

      {invitationsLoading ? (
        <div className="divide-y divide-border">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3.5">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
          <button
            onClick={onInvite}
            className="mt-2 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Invite someone
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {pending.map((inv) => (
            <InvitationRow key={inv.id} invitation={inv} workspaceId={workspaceId} />
          ))}
        </div>
      )}

      {/* ── Confirmation dialogs ── */}
      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (!confirmRemove) return
          removeMember.mutate(confirmRemove.user_id, {
            onSuccess: () => {
              toast.success("Member removed")
              setConfirmRemove(null)
            },
            onError: () => {
              toast.error("Failed to remove member")
              setConfirmRemove(null)
            },
          })
        }}
        title="Remove member"
        description={`Remove ${confirmRemove?.user?.email ?? "this member"} from the workspace? They will lose access to all projects.`}
        confirmLabel="Remove"
        variant="destructive"
        loading={removeMember.isPending}
      />

    </>
  )
}
