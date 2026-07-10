import React, { useState } from "react"
import {
  useWorkspaceMembers,
  useTeams,
  useCreateTeam,
  useDeleteTeam,
} from "@/api/hooks/useWorkspaces"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"
import {
  Plus,
  MoreHorizontal,
  Users2,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { TeamMemberList } from "./TeamMemberList"

export function TeamsTab({ workspaceId }: { workspaceId: string }) {
  const { data: teams, isLoading } = useTeams(workspaceId)
  const { data: members } = useWorkspaceMembers(workspaceId)
  const createTeam = useCreateTeam(workspaceId)
  const deleteTeam = useDeleteTeam(workspaceId)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(null)

  const confirmDeleteTeam = teams?.find((t) => t.id === confirmDeleteTeamId)

  const toggle = (teamId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(teamId) ? next.delete(teamId) : next.add(teamId)
      return next
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return
    createTeam.mutate(
      { name: newTeamName.trim() },
      {
        onSuccess: () => {
          toast.success("Team created")
          setNewTeamName("")
          setCreating(false)
        },
        onError: () => toast.error("Failed to create team"),
      }
    )
  }

  return (
    <>
      <div className="px-6 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Teams
          {!isLoading && teams && (
            <span className="ml-2 font-normal normal-case tracking-normal">
              · {teams.length}
            </span>
          )}
        </span>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" />
          New team
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="px-6 py-3 border-b border-border bg-muted/5">
          <form onSubmit={handleCreate} className="flex items-center gap-2">
            <Input
              autoFocus
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="h-8 text-sm flex-1 max-w-[240px]"
            />
            <Button type="submit" size="sm" className="h-8" disabled={!newTeamName.trim() || createTeam.isPending}>
              {createTeam.isPending ? "Creating…" : "Create"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => { setCreating(false); setNewTeamName("") }}>
              Cancel
            </Button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="divide-y divide-border">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3.5">
              <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ))}
        </div>
      ) : !teams?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Users2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">No teams yet</p>
          <p className="text-sm text-muted-foreground mb-3">
            Teams make it easy to grant project access to groups of people.
          </p>
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            Create a team
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {teams.map((team) => {
            const isExpanded = expanded.has(team.id)
            return (
              <div key={team.id}>
                <div className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#f9fafb] dark:hover:bg-muted/30 transition-colors group">
                  <button
                    onClick={() => toggle(team.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  >
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{team.name}</p>
                    {team.description && (
                      <p className="text-xs text-muted-foreground truncate">{team.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {team.member_count} {team.member_count === 1 ? "member" : "members"}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmDeleteTeamId(team.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isExpanded && (
                  <TeamMemberList
                    workspaceId={workspaceId}
                    teamId={team.id}
                    allMembers={members ?? []}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteTeamId}
        onClose={() => setConfirmDeleteTeamId(null)}
        onConfirm={() => {
          if (!confirmDeleteTeamId) return
          deleteTeam.mutate(confirmDeleteTeamId, {
            onSuccess: () => {
              toast.success("Team deleted")
              setConfirmDeleteTeamId(null)
            },
            onError: () => {
              toast.error("Failed to delete team")
              setConfirmDeleteTeamId(null)
            },
          })
        }}
        title="Delete team"
        description={`Delete "${confirmDeleteTeam?.name ?? "this team"}"? All members will be removed from the team. Projects will not be affected.`}
        confirmLabel="Delete team"
        variant="destructive"
        loading={deleteTeam.isPending}
      />
    </>
  )
}
