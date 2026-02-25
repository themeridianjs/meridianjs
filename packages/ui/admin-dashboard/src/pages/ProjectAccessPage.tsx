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
import { Skeleton } from "@/components/ui/skeleton"
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

  const memberUserIds = new Set(access?.members.map((m) => m.user_id) ?? [])
  const teamIds = new Set(access?.teams.map((t) => t.team_id) ?? [])

  const availableUsers = (wsMembers ?? []).filter((m) => !memberUserIds.has(m.user_id))
  const availableTeams = (wsTeams ?? []).filter((t) => !teamIds.has(t.id))

  return (
    <div className="p-6 max-w-2xl">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Access</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage who has access to this project.
          </p>
        </div>

        <div className="p-6 space-y-8">
          {/* ── People ── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              People
            </p>

            {isLoading ? (
              <div className="space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-36" />
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
                    <div key={m.id} className="flex items-center gap-3 py-1.5 group">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{displayName}</p>
                        {u?.email && (
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        )}
                      </div>
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded font-medium shrink-0",
                        m.role === "manager" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" : "bg-muted text-muted-foreground"
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
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add person */}
            {availableUsers.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={addUserId} onValueChange={setAddUserId}>
                  <SelectTrigger className="h-9 text-sm flex-1">
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
                    className="h-9 px-4 shrink-0"
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Teams
            </p>

            {isLoading ? (
              <div className="space-y-2.5">
                {[1].map((i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 w-32" />
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
                    <div key={t.id} className="flex items-center gap-3 py-1.5 group">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Users2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{team?.name ?? "Unknown team"}</p>
                        {team && (
                          <p className="text-xs text-muted-foreground">
                            {team.member_count} {team.member_count === 1 ? "member" : "members"}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          removeTeam.mutate(t.team_id, {
                            onSuccess: () => toast.success("Team access removed"),
                            onError: () => toast.error("Failed to remove team"),
                          })
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add team */}
            {availableTeams.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Users2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={addTeamId} onValueChange={setAddTeamId}>
                  <SelectTrigger className="h-9 text-sm flex-1">
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
                    className="h-9 px-4 shrink-0"
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
        </div>
      </div>
    </div>
  )
}
