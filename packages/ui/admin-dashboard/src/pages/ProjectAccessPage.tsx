import { useState } from "react"
import { useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MultiSelect } from "@/components/ui/multi-select"
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
  useAddProjectMembersBatch,
  useRemoveProjectMember,
  useAddProjectTeamsBatch,
  useRemoveProjectTeam,
} from "@/api/hooks/useProjectAccess"
import { useWorkspaceMembers, useTeams } from "@/api/hooks/useWorkspaces"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useAuth } from "@/stores/auth"
import { toast } from "sonner"
import { X, UserPlus, Users2, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

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
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
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
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
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

  const addMembersBatch = useAddProjectMembersBatch(projectId)
  const removeMember = useRemoveProjectMember(projectId)
  const addTeamsBatch = useAddProjectTeamsBatch(projectId)
  const removeTeam = useRemoveProjectTeam(projectId)

  const [addUserIds, setAddUserIds] = useState<string[]>([])
  const [addTeamIds, setAddTeamIds] = useState<string[]>([])
  const [memberPage, setMemberPage] = useState(0)
  const [teamPage, setTeamPage] = useState(0)
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
    <div className="p-2 pb-24 md:pb-2">
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
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  People
                  {memberCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-[20px] px-1.5 text-[11px] font-medium rounded-full"
                    >
                      {memberCount}
                    </Badge>
                  )}
                </span>
                {availableUsers.length > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <MultiSelect
                      options={availableUsers.map((m) => {
                        const u = m.user
                        const first = u?.first_name ?? ""
                        const last = u?.last_name ?? ""
                        return { value: m.user_id, label: `${first} ${last}`.trim() || u?.email || "Unknown" }
                      })}
                      selected={addUserIds}
                      onSelectionChange={setAddUserIds}
                      placeholder="Add people…"
                      className="w-full sm:w-56"
                    />
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs shrink-0"
                      disabled={addUserIds.length === 0 || addMembersBatch.isPending}
                      onClick={() =>
                        addMembersBatch.mutate(
                          { userIds: addUserIds },
                          {
                            onSuccess: (data) => {
                              toast.success(`${data.added} member${data.added === 1 ? "" : "s"} added`)
                              setAddUserIds([])
                            },
                            onError: () => toast.error("Failed to grant access"),
                          }
                        )
                      }
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {addUserIds.length <= 1 ? "Add" : `Add ${addUserIds.length}`}
                    </Button>
                  </div>
                )}
              </div>

              {memberCount === 0 ? (
                <p className="text-sm text-muted-foreground px-6 py-4">No individual members.</p>
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {(access?.members ?? []).slice(memberPage * PAGE_SIZE, (memberPage + 1) * PAGE_SIZE).map((m) => (
                      <MemberRow
                        key={m.id}
                        member={m}
                        onRequestRemove={(userId, displayName) =>
                          setMemberPendingRemoval({ userId, displayName })
                        }
                      />
                    ))}
                  </div>
                  {memberCount > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {memberPage * PAGE_SIZE + 1}–{Math.min((memberPage + 1) * PAGE_SIZE, memberCount)} of {memberCount}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setMemberPage((p) => p - 1)} disabled={memberPage === 0}>
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums w-12 text-center">
                          {memberPage + 1} / {Math.ceil(memberCount / PAGE_SIZE)}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setMemberPage((p) => p + 1)} disabled={(memberPage + 1) * PAGE_SIZE >= memberCount}>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-border">
              <div className="px-6 py-2 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  Teams
                  {teamCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-[20px] px-1.5 text-[11px] font-medium rounded-full"
                    >
                      {teamCount}
                    </Badge>
                  )}
                </span>
                {availableTeams.length > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <MultiSelect
                      options={availableTeams.map((t) => ({ value: t.id, label: t.name }))}
                      selected={addTeamIds}
                      onSelectionChange={setAddTeamIds}
                      placeholder="Add teams…"
                      className="w-full sm:w-56"
                    />
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs shrink-0"
                      disabled={addTeamIds.length === 0 || addTeamsBatch.isPending}
                      onClick={() =>
                        addTeamsBatch.mutate(addTeamIds, {
                          onSuccess: (data) => {
                            toast.success(`${data.added} team${data.added === 1 ? "" : "s"} added`)
                            setAddTeamIds([])
                          },
                          onError: () => toast.error("Failed to add teams"),
                        })
                      }
                    >
                      <Users2 className="h-3.5 w-3.5" />
                      {addTeamIds.length <= 1 ? "Add" : `Add ${addTeamIds.length}`}
                    </Button>
                  </div>
                )}
              </div>

              {teamCount === 0 ? (
                <p className="text-sm text-muted-foreground px-6 py-4">No teams have access.</p>
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {(access?.teams ?? []).slice(teamPage * PAGE_SIZE, (teamPage + 1) * PAGE_SIZE).map((t) => (
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
                  {teamCount > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {teamPage * PAGE_SIZE + 1}–{Math.min((teamPage + 1) * PAGE_SIZE, teamCount)} of {teamCount}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setTeamPage((p) => p - 1)} disabled={teamPage === 0}>
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums w-12 text-center">
                          {teamPage + 1} / {Math.ceil(teamCount / PAGE_SIZE)}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setTeamPage((p) => p + 1)} disabled={(teamPage + 1) * PAGE_SIZE >= teamCount}>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
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
