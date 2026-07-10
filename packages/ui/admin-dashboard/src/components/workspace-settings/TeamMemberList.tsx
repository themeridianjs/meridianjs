import { useState } from "react"
import {
  useTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
  type WorkspaceMember,
} from "@/api/hooks/useWorkspaces"
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"
import { X, UserPlus } from "lucide-react"

export function TeamMemberList({
  workspaceId,
  teamId,
  allMembers,
}: {
  workspaceId: string
  teamId: string
  allMembers: WorkspaceMember[]
}) {
  const { data: teamMembers, isLoading } = useTeamMembers(workspaceId, teamId)
  const addMember = useAddTeamMember(workspaceId, teamId)
  const removeMember = useRemoveTeamMember(workspaceId, teamId)
  const [addingUserId, setAddingUserId] = useState("")
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null)
  const [confirmAddUserId, setConfirmAddUserId] = useState<string | null>(null)

  const memberUserIds = new Set(teamMembers?.map((m) => m.user_id) ?? [])
  const available = allMembers.filter((m) => !memberUserIds.has(m.user_id))

  const confirmRemoveMember = teamMembers?.find((m) => m.user_id === confirmRemoveUserId)
  const confirmAddMember = allMembers.find((m) => m.user_id === confirmAddUserId)

  return (
    <div className="bg-muted/10 border-t border-border">
      {isLoading ? (
        <div className="px-8 py-3">
          <Skeleton className="h-3 w-40" />
        </div>
      ) : teamMembers?.length === 0 ? (
        <p className="px-8 py-3 text-xs text-muted-foreground">No members in this team yet.</p>
      ) : (
        <div className="divide-y divide-border/50">
          {teamMembers?.map((m) => {
            const u = m.user
            const first = u?.first_name ?? ""
            const last = u?.last_name ?? ""
            const displayName = `${first} ${last}`.trim() || u?.email || "Unknown"
            const initials = (first[0] ?? last[0] ?? u?.email?.[0] ?? "U").toUpperCase()

            return (
              <div key={m.id} className="flex items-center gap-3 px-8 py-2.5 group hover:bg-muted/20 transition-colors">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-[10px] font-medium">{initials}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm truncate">{displayName}</span>
                <button
                  onClick={() => setConfirmRemoveUserId(m.user_id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  title="Remove from team"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add member to team */}
      {available.length > 0 && (
        <div className="px-8 py-2.5 flex items-center gap-2 border-t border-border/50">
          <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select value={addingUserId} onValueChange={setAddingUserId}>
            <SelectTrigger className="h-7 text-xs flex-1 max-w-[200px]">
              <SelectValue placeholder="Add member…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((m) => {
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
          {addingUserId && (
            <Button
              size="sm"
              className="h-7 text-xs px-2"
              disabled={addMember.isPending}
              onClick={() => setConfirmAddUserId(addingUserId)}
            >
              Add
            </Button>
          )}
        </div>
      )}
      {/* Remove from team confirmation */}
      <ConfirmDialog
        open={!!confirmRemoveUserId}
        onClose={() => setConfirmRemoveUserId(null)}
        onConfirm={() => {
          if (!confirmRemoveUserId) return
          removeMember.mutate(confirmRemoveUserId, {
            onSuccess: () => {
              toast.success("Removed from team")
              setConfirmRemoveUserId(null)
            },
            onError: () => {
              toast.error("Failed to remove")
              setConfirmRemoveUserId(null)
            },
          })
        }}
        title="Remove from team"
        description={`Remove ${confirmRemoveMember?.user?.email ?? "this member"} from the team?`}
        confirmLabel="Remove"
        variant="destructive"
        loading={removeMember.isPending}
      />

      {/* Add to team confirmation */}
      <ConfirmDialog
        open={!!confirmAddUserId}
        onClose={() => { setConfirmAddUserId(null); setAddingUserId("") }}
        onConfirm={() => {
          if (!confirmAddUserId) return
          addMember.mutate(confirmAddUserId, {
            onSuccess: () => {
              toast.success("Added to team")
              setConfirmAddUserId(null)
              setAddingUserId("")
            },
            onError: () => {
              toast.error("Failed to add")
              setConfirmAddUserId(null)
            },
          })
        }}
        title="Add to team"
        description={`Add ${confirmAddMember?.user?.email ?? "this member"} to the team?`}
        confirmLabel="Add"
        loading={addMember.isPending}
      />
    </div>
  )
}
