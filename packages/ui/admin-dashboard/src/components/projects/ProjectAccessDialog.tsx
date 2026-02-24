import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useProjectAccess,
  useAddProjectMember,
  useRemoveProjectMember,
  useAddProjectTeam,
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

  const addMember = useAddProjectMember(projectId)
  const removeMember = useRemoveProjectMember(projectId)
  const addTeam = useAddProjectTeam(projectId)
  const removeTeam = useRemoveProjectTeam(projectId)

  const [addUserId, setAddUserId] = useState("")
  const [addTeamId, setAddTeamId] = useState("")

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

            {/* Add person */}
            {availableUsers.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Select value={addUserId} onValueChange={setAddUserId}>
                  <SelectTrigger className="h-8 text-xs flex-1">
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
                {addUserId && (
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs shrink-0"
                    disabled={addMember.isPending}
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
                    Add
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

            {/* Add team */}
            {availableTeams.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Users2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Select value={addTeamId} onValueChange={setAddTeamId}>
                  <SelectTrigger className="h-8 text-xs flex-1">
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
                {addTeamId && (
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs shrink-0"
                    disabled={addTeam.isPending}
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
                    Add
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
