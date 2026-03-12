import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { MultiSelect } from "@/components/ui/multi-select"
import {
  useProjectAccess,
  useAddProjectMembersBatch,
  useRemoveProjectMember,
  useAddProjectTeamsBatch,
  useRemoveProjectTeam,
} from "@/api/hooks/useProjectAccess"
import { useWorkspaceMembers, useTeams } from "@/api/hooks/useWorkspaces"
import { useAuth } from "@/stores/auth"
import { toast } from "sonner"
import { X, UserPlus, Users2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectAccessDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectName: string
}

export function ProjectAccessDialog({
  open,
  onClose,
  projectId,
  projectName,
}: ProjectAccessDialogProps) {
  const { workspace: wsRef } = useAuth()
  const workspaceId = wsRef?.id ?? ""

  const { data: access, isLoading } = useProjectAccess(projectId)
  const { data: wsMembers } = useWorkspaceMembers(workspaceId)
  const { data: wsTeams } = useTeams(workspaceId)

  const addMembersBatch = useAddProjectMembersBatch(projectId)
  const removeMember = useRemoveProjectMember(projectId)
  const addTeamsBatch = useAddProjectTeamsBatch(projectId)
  const removeTeam = useRemoveProjectTeam(projectId)

  const [addUserIds, setAddUserIds] = useState<string[]>([])
  const [addTeamIds, setAddTeamIds] = useState<string[]>([])

  const memberUserIds = new Set(access?.members.map((m) => m.user_id) ?? [])
  const teamIds = new Set(access?.teams.map((t) => t.team_id) ?? [])

  const availableUsers = (wsMembers ?? []).filter((m) => !memberUserIds.has(m.user_id))
  const availableTeams = (wsTeams ?? []).filter((t) => !teamIds.has(t.id))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Access — {projectName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* ── People ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">People</p>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-3.5 w-32" />
                  </div>
                ))}
              </div>
            ) : access?.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No individual members.</p>
            ) : (
              <div className="space-y-1">
                {access?.members.map((m) => {
                  const u = m.user
                  const first = u?.first_name ?? ""
                  const last = u?.last_name ?? ""
                  const displayName = `${first} ${last}`.trim() || u?.email || "Unknown"
                  const initials = (first[0] ?? last[0] ?? u?.email?.[0] ?? "U").toUpperCase()

                  return (
                    <div key={m.id} className="flex items-center gap-2.5 py-1 group">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[11px] font-medium">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm truncate">{displayName}</span>
                      <span className={cn(
                        "text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0",
                        m.role === "manager" ? "bg-indigo/10 text-indigo" : "bg-muted text-muted-foreground"
                      )}>
                        {m.role}
                      </span>
                      <button
                        onClick={() =>
                          removeMember.mutate(m.user_id, {
                            onSuccess: () => toast.success("Access removed"),
                            onError: () => toast.error("Failed to remove"),
                          })
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add person(s) */}
            {availableUsers.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
                  className="flex-1"
                />
                {addUserIds.length > 0 && (
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs shrink-0"
                    disabled={addMembersBatch.isPending}
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
                    {addUserIds.length === 1 ? "Add" : `Add ${addUserIds.length} members`}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ── Teams ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teams</p>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <Skeleton className="h-3.5 w-28" />
                  </div>
                ))}
              </div>
            ) : access?.teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teams have access.</p>
            ) : (
              <div className="space-y-1">
                {access?.teams.map((t) => {
                  const team = t.team
                  return (
                    <div key={t.id} className="flex items-center gap-2.5 py-1 group">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="flex-1 text-sm truncate">{team?.name ?? "Unknown team"}</span>
                      {team && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {team.member_count} {team.member_count === 1 ? "member" : "members"}
                        </span>
                      )}
                      <button
                        onClick={() =>
                          removeTeam.mutate(t.team_id, {
                            onSuccess: () => toast.success("Team access removed"),
                            onError: () => toast.error("Failed to remove team"),
                          })
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add team(s) */}
            {availableTeams.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Users2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <MultiSelect
                  options={availableTeams.map((t) => ({ value: t.id, label: t.name }))}
                  selected={addTeamIds}
                  onSelectionChange={setAddTeamIds}
                  placeholder="Add teams…"
                  className="flex-1"
                />
                {addTeamIds.length > 0 && (
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs shrink-0"
                    disabled={addTeamsBatch.isPending}
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
                    {addTeamIds.length === 1 ? "Add" : `Add ${addTeamIds.length} teams`}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
