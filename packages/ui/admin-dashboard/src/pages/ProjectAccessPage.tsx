import { useState } from "react"
import { useParams } from "react-router-dom"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  useProjectAccess,
  useAddProjectMember,
  useRemoveProjectMember,
  useAddProjectTeam,
  useRemoveProjectTeam,
} from "@/api/hooks/useProjectAccess"
import { useWorkspaceMembers, useTeams } from "@/api/hooks/useWorkspaces"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useAuth } from "@/stores/auth"
import { toast } from "sonner"
import { X, UserPlus, Users2 } from "lucide-react"
import { cn } from "@/lib/utils"

function MemberRow({
  member,
  onRequestRemove,
}: {
  member: any
  onRequestRemove: (userId: string, displayName: string) => void
}) {
  const u = member.user
  const first = u?.first_name ?? ""
  const last = u?.last_name ?? ""
  const displayName = `${first} ${last}`.trim() || u?.email || "Unknown"
  const initials = (first[0] ?? last[0] ?? u?.email?.[0] ?? "U").toUpperCase()

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        {u?.email && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
        )}
      </div>

      <Badge
        className={cn(
          "shrink-0 text-[11px] border-0 w-20 justify-center",
          member.role === "manager"
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        )}
      >
        {member.role}
      </Badge>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRequestRemove(member.user_id, displayName)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function TeamRow({
  teamEntry,
  onRemove,
}: {
  teamEntry: any
  onRemove: (teamId: string) => void
}) {
  const team = teamEntry.team

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Users2 className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{team?.name ?? "Unknown team"}</p>
        {team && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {team.member_count} {team.member_count === 1 ? "member" : "members"}
          </p>
        )}
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(teamEntry.team_id)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export function ProjectAccessPage() {
  const { projectKey } = useParams<{ projectKey: string }>()
  const { workspace: wsRef } = useAuth()
  const workspaceId = wsRef?.id ?? ""

  const { data: project } = useProjectByKey(projectKey ?? "")
  const projectId = project?.id ?? ""

  const { data: access, isLoading } = useProjectAccess(projectId)
  const { data: wsMembers } = useWorkspaceMembers(workspaceId)
  const { data: wsTeams } = useTeams(workspaceId)

  const addMember = useAddProjectMember(projectId)
  const removeMember = useRemoveProjectMember(projectId)
  const addTeam = useAddProjectTeam(projectId)
  const removeTeam = useRemoveProjectTeam(projectId)

  const [addUserId, setAddUserId] = useState("")
  const [addTeamId, setAddTeamId] = useState("")
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<{
    userId: string
    displayName: string
  } | null>(null)

  const memberUserIds = new Set(access?.members.map((m) => m.user_id) ?? [])
  const teamIds = new Set(access?.teams.map((t) => t.team_id) ?? [])

  const availableUsers = (wsMembers ?? []).filter((m) => !memberUserIds.has(m.user_id))
  const availableTeams = (wsTeams ?? []).filter((t) => !teamIds.has(t.id))
  const memberCount = access?.members.length ?? 0
  const teamCount = access?.teams.length ?? 0

  function confirmRemoveMember() {
    if (!memberPendingRemoval) return

    removeMember.mutate(memberPendingRemoval.userId, {
      onSuccess: () => {
        toast.success("Access removed")
        setMemberPendingRemoval(null)
      },
      onError: () => toast.error("Failed to remove"),
    })
  }

  return (
    <div className="p-2">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Access</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage who has access to this project.
            </p>
          </div>
          {!isLoading && (
            <p className="text-xs text-muted-foreground shrink-0">
              {memberCount} member{memberCount !== 1 ? "s" : ""} • {teamCount} team{teamCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {isLoading ? (
          <div>
            <div className="px-6 py-2 border-b border-border bg-muted/20">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">People</span>
            </div>
            <div className="divide-y divide-border">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-44" />
                  <div className="flex-1" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>

            <div className="px-6 py-2 border-y border-border bg-muted/20">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teams</span>
            </div>
            <div className="divide-y divide-border">
              {[1].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div>
              <div className="px-6 py-2 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  People
                </span>
                {availableUsers.length > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={addUserId} onValueChange={setAddUserId}>
                      <SelectTrigger className="h-8 text-xs w-full sm:w-56">
                        <SelectValue placeholder="Add person…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((m) => {
                          const u = m.user
                          const first = u?.first_name ?? ""
                          const last = u?.last_name ?? ""
                          const displayName = `${first} ${last}`.trim() || u?.email || "Unknown"
                          return (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {displayName}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs shrink-0"
                      disabled={!addUserId || addMember.isPending}
                      onClick={() =>
                        addMember.mutate(
                          { userId: addUserId },
                          {
                            onSuccess: () => {
                              toast.success("Access granted")
                              setAddUserId("")
                            },
                            onError: () => toast.error("Failed to grant access"),
                          }
                        )
                      }
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                )}
              </div>

              {memberCount === 0 ? (
                <p className="text-sm text-muted-foreground px-6 py-4">No individual members.</p>
              ) : (
                <div className="divide-y divide-border">
                  {access?.members.map((m) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      onRequestRemove={(userId, displayName) =>
                        setMemberPendingRemoval({
                          userId,
                          displayName,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border">
              <div className="px-6 py-2 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Teams
                </span>
                {availableTeams.length > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={addTeamId} onValueChange={setAddTeamId}>
                      <SelectTrigger className="h-8 text-xs w-full sm:w-56">
                        <SelectValue placeholder="Add team…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTeams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs shrink-0"
                      disabled={!addTeamId || addTeam.isPending}
                      onClick={() =>
                        addTeam.mutate(addTeamId, {
                          onSuccess: () => {
                            toast.success("Team access granted")
                            setAddTeamId("")
                          },
                          onError: () => toast.error("Failed to add team"),
                        })
                      }
                    >
                      <Users2 className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                )}
              </div>

              {teamCount === 0 ? (
                <p className="text-sm text-muted-foreground px-6 py-4">No teams have access.</p>
              ) : (
                <div className="divide-y divide-border">
                  {access?.teams.map((t) => (
                    <TeamRow
                      key={t.id}
                      teamEntry={t}
                      onRemove={(teamId) =>
                        removeTeam.mutate(teamId, {
                          onSuccess: () => toast.success("Team access removed"),
                          onError: () => toast.error("Failed to remove team"),
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {memberCount === 0 && teamCount === 0 && availableUsers.length === 0 && availableTeams.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center border-t border-border">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Users2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">No access entries yet</p>
                <p className="text-sm text-muted-foreground">
                  Add workspace people or teams first to grant project access.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!memberPendingRemoval}
        onOpenChange={(open) => {
          if (!open) setMemberPendingRemoval(null)
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member access?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberPendingRemoval
                ? `${memberPendingRemoval.displayName} will lose access to this project.`
                : "This member will lose access to this project."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                confirmRemoveMember()
              }}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
