import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import {
  useWorkspaces,
  useUpdateWorkspace,
  useInvitations,
  useCreateInvitation,
  useRevokeInvitation,
  useWorkspaceMembers,
  useAddWorkspaceMember,
  useUpdateWorkspaceMemberRole,
  useRemoveWorkspaceMember,
  useTeams,
  useCreateTeam,
  useDeleteTeam,
  useTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
  type Invitation,
  type WorkspaceMember,
} from "@/api/hooks/useWorkspaces"
import { useUsers } from "@/api/hooks/useUsers"
import { useRoles, useAssignUserRole } from "@/api/hooks/useRoles"
import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { format } from "date-fns"
import { WidgetZone } from "@/components/WidgetZone"
import {
  Users,
  Copy,
  Check,
  Plus,
  Link2,
  X,
  ShieldCheck,
  UserRound,
  MoreHorizontal,
  Users2,
  Trash2,
  ChevronDown,
  ChevronRight,
  UserPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className={cn("text-muted-foreground hover:text-foreground transition-colors", className)}
      title="Copy"
    >
      {copied
        ? <Check className="h-3.5 w-3.5 text-emerald-500" />
        : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// ── Invite / add member dialog ────────────────────────────────────────────────

type DialogMode = "existing" | "invite"

interface InviteMemberDialogProps {
  open: boolean
  onClose: () => void
  workspaceId: string
}

function RoleSelectControl({
  value,
  onChange,
  appRoles,
}: {
  value: string
  onChange: (v: string) => void
  appRoles: { id: string; name: string }[] | undefined
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__admin">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Admin</span>
            <span className="text-xs text-muted-foreground ml-1">— Full workspace access</span>
          </div>
        </SelectItem>
        {appRoles && appRoles.length > 0 && (
          <>
            <div className="px-2 pt-2 pb-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Roles
              </span>
            </div>
            {appRoles.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  )
}

function InviteMemberDialog({ open, onClose, workspaceId }: InviteMemberDialogProps) {
  const [mode, setMode] = useState<DialogMode>("existing")
  // Existing-user mode state
  const [search, setSearch] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [addRole, setAddRole] = useState<string>("__admin")
  // Invite mode state
  const [email, setEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<string>("__admin")
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null)

  const { data: allUsers = [] } = useUsers()
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const addMember = useAddWorkspaceMember(workspaceId)
  const createInvitation = useCreateInvitation(workspaceId)
  const { data: appRoles } = useRoles()

  const memberUserIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members])
  const nonMembers = useMemo(
    () => allUsers.filter((u) => !memberUserIds.has(u.id)),
    [allUsers, memberUserIds]
  )
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return nonMembers
    return nonMembers.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
    )
  }, [nonMembers, search])

  useEffect(() => {
    if (open) {
      const defaultRole = appRoles && appRoles.length > 0 ? appRoles[0].id : "__admin"
      setSearch("")
      setSelectedUserId("")
      setAddRole(defaultRole)
      setEmail("")
      setInviteRole(defaultRole)
      setCreatedInvitation(null)
      setMode("existing")
    }
  }, [open, appRoles])

  const roleLabel = (role: string) =>
    role === "__admin" ? "Admin" : (appRoles?.find((r) => r.id === role)?.name ?? "Member")

  const handleAddExisting = () => {
    if (!selectedUserId) return
    const isAdmin = addRole === "__admin"
    addMember.mutate(
      { user_id: selectedUserId, role: isAdmin ? "admin" : "member" },
      {
        onSuccess: () => {
          toast.success("Member added")
          onClose()
        },
        onError: (err: Error) => toast.error(err.message || "Failed to add member"),
      }
    )
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    const isAdmin = inviteRole === "__admin"
    createInvitation.mutate(
      {
        email: email.trim() || undefined,
        role: isAdmin ? "admin" : "member",
        app_role_id: isAdmin ? null : inviteRole,
      },
      {
        onSuccess: (data) => {
          setCreatedInvitation(data.invitation)
          toast.success("Invitation created")
        },
        onError: (err: Error) => toast.error(err.message || "Failed to create invitation"),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
        </DialogHeader>

        {/* Mode toggle — hidden once an invite link has been generated */}
        {!createdInvitation && (
          <div className="flex rounded-lg border border-border p-0.5 bg-muted/40 gap-0.5">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={cn(
                "flex-1 text-sm py-1.5 rounded-md font-medium transition-colors",
                mode === "existing"
                  ? "bg-white dark:bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Existing user
            </button>
            <button
              type="button"
              onClick={() => setMode("invite")}
              className={cn(
                "flex-1 text-sm py-1.5 rounded-md font-medium transition-colors",
                mode === "invite"
                  ? "bg-white dark:bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Send invite
            </button>
          </div>
        )}

        {/* ── Existing user ── */}
        {mode === "existing" && !createdInvitation && (
          <div className="space-y-3 pt-1">
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
              autoFocus
            />

            <div className="rounded-lg border border-border overflow-hidden">
              {nonMembers.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <p className="text-sm text-muted-foreground">All users are already members.</p>
                  <button
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    onClick={() => setMode("invite")}
                  >
                    Send an invite instead
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No users match "{search}"</p>
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto divide-y divide-border">
                  {filtered.map((u) => {
                    const first = u.first_name ?? ""
                    const last = u.last_name ?? ""
                    const displayName = `${first} ${last}`.trim() || u.email
                    const initials = (first[0] ?? last[0] ?? u.email[0] ?? "U").toUpperCase()
                    const isSelected = selectedUserId === u.id
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUserId(isSelected ? "" : u.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                          isSelected
                            ? "bg-indigo/5 dark:bg-indigo/10"
                            : "hover:bg-muted/40"
                        )}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[11px] font-medium">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-indigo shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {nonMembers.length > 0 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <RoleSelectControl value={addRole} onChange={setAddRole} appRoles={appRoles} />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!selectedUserId || addMember.isPending}
                    onClick={handleAddExisting}
                  >
                    {addMember.isPending ? "Adding…" : "Add to workspace"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Send invite ── */}
        {mode === "invite" && !createdInvitation && (
          <form onSubmit={handleInvite} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Email <span className="font-normal">(optional)</span>
              </label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Leave blank to generate a shareable link.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <RoleSelectControl value={inviteRole} onChange={setInviteRole} appRoles={appRoles} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createInvitation.isPending}>
                {createInvitation.isPending ? "Creating…" : "Create invitation"}
              </Button>
            </div>
          </form>
        )}

        {/* ── Invite link success ── */}
        {createdInvitation && (
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Share this link with{" "}
              {createdInvitation.email ? (
                <span className="font-medium text-foreground">{createdInvitation.email}</span>
              ) : (
                "anyone you want to invite"
              )}
              . They will join as{" "}
              <span className="font-medium text-foreground">{roleLabel(inviteRole)}</span>.
            </p>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-xs font-mono text-foreground flex-1 min-w-0 break-all">
                {`${window.location.origin}/invite/${createdInvitation.token}`}
              </span>
              <CopyButton
                value={`${window.location.origin}/invite/${createdInvitation.token}`}
                className="shrink-0"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setCreatedInvitation(null)}
              >
                Create another
              </button>
              <Button size="sm" onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Invitation row ────────────────────────────────────────────────────────────

function InvitationRow({ invitation, workspaceId }: { invitation: Invitation; workspaceId: string }) {
  const revoke = useRevokeInvitation(workspaceId)
  const inviteUrl = `${window.location.origin}/invite/${invitation.token}`

  return (
    <div className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#f9fafb] dark:hover:bg-muted/30 transition-colors group">
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
            invitation.role === "admin"
              ? "bg-indigo/10 text-indigo"
              : "bg-muted text-muted-foreground"
          )}>
            {invitation.role === "admin" ? "Admin" : "Member"}
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
        <span className="text-xs text-muted-foreground hidden sm:block">
          {format(new Date(invitation.created_at), "MMM d")}
        </span>
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
  )
}

// ── General tab ───────────────────────────────────────────────────────────────

function GeneralTab({ workspaceId }: { workspaceId: string }) {
  const { workspace: wsRef, setWorkspace } = useAuth()
  const { data: workspaces, isLoading } = useWorkspaces()
  const workspace = workspaces?.find((w) => w.id === wsRef?.id)
  const updateWorkspace = useUpdateWorkspace(workspaceId)
  const [name, setName] = useState("")

  useEffect(() => {
    if (workspace) setName(workspace.name)
  }, [workspace?.name])

  const isDirty = workspace ? name.trim() !== workspace.name : false

  const handleSave = () => {
    if (!name.trim() || !workspace) return
    updateWorkspace.mutate(
      { name: name.trim() },
      {
        onSuccess: (data) => {
          setWorkspace({ id: data.workspace.id, name: data.workspace.name, slug: data.workspace.slug })
          toast.success("Workspace updated")
        },
        onError: () => toast.error("Failed to update workspace"),
      }
    )
  }

  return (
    <>
      <div className="px-6 py-2 border-b border-border bg-muted/20">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Workspace details
        </span>
      </div>

      <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3.5 border-b border-border">
        <span className="text-sm text-muted-foreground">Name</span>
        {isLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <div className="flex items-center gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 w-64 text-sm bg-transparent"
              placeholder="Workspace name"
            />
            {isDirty && (
              <Button
                size="sm"
                className="h-8"
                onClick={handleSave}
                disabled={!name.trim() || updateWorkspace.isPending}
              >
                {updateWorkspace.isPending ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3.5 border-b border-border">
        <span className="text-sm text-muted-foreground">URL slug</span>
        {isLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-foreground">{workspace?.slug}</span>
            <CopyButton value={workspace?.slug ?? ""} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3.5 border-b border-border">
        <span className="text-sm text-muted-foreground">Plan</span>
        {isLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span className="text-sm capitalize">{workspace?.plan ?? "free"}</span>
        )}
      </div>

      <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3.5">
        <span className="text-sm text-muted-foreground">Created</span>
        {isLoading ? (
          <Skeleton className="h-4 w-28" />
        ) : (
          <span className="text-sm text-muted-foreground">
            {workspace?.created_at
              ? format(new Date(workspace.created_at), "MMMM d, yyyy")
              : "—"}
          </span>
        )}
      </div>
    </>
  )
}

// ── Members tab ───────────────────────────────────────────────────────────────

function MembersTab({ workspaceId, onInvite }: { workspaceId: string; onInvite: () => void }) {
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId)
  const { data: invitations, isLoading: invitationsLoading } = useInvitations(workspaceId)
  const updateRole = useUpdateWorkspaceMemberRole(workspaceId)
  const removeMember = useRemoveWorkspaceMember(workspaceId)
  const assignUserRole = useAssignUserRole()
  const { data: appRoles } = useRoles()
  const { user } = useAuth()

  const pending = invitations?.filter((i) => i.status === "pending") ?? []

  return (
    <>
      {/* ── Current members ── */}
      <div className="px-6 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Members
          {!membersLoading && members && (
            <span className="ml-2 font-normal normal-case tracking-normal">
              · {members.length}
            </span>
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
        <div className="divide-y divide-border">
          {members.map((m) => {
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

                {/* Role badge */}
                <span className={cn(
                  "inline-flex items-center text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0",
                  m.role === "admin"
                    ? "bg-indigo/10 text-indigo"
                    : "bg-muted text-muted-foreground"
                )}>
                  {m.role === "admin" ? "Admin" : "Member"}
                </span>

                {/* Custom app role */}
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
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={() =>
                          updateRole.mutate(
                            { userId: m.user_id, role: m.role === "admin" ? "member" : "admin" },
                            {
                              onSuccess: () => toast.success("Role updated"),
                              onError: () => toast.error("Failed to update role"),
                            }
                          )
                        }
                      >
                        {m.role === "admin" ? (
                          <><UserRound className="h-3.5 w-3.5 mr-2" />Make member</>
                        ) : (
                          <><ShieldCheck className="h-3.5 w-3.5 mr-2" />Make admin</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          removeMember.mutate(m.user_id, {
                            onSuccess: () => toast.success("Member removed"),
                            onError: () => toast.error("Failed to remove member"),
                          })
                        }
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
      )}

      {/* ── Pending invitations ── */}
      <div className="px-6 py-2 border-t border-b border-border bg-muted/20 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Pending invitations
          {!invitationsLoading && pending.length > 0 && (
            <span className="ml-2 font-normal normal-case tracking-normal">
              · {pending.length}
            </span>
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
    </>
  )
}

// ── Team member list (inline, expandable) ────────────────────────────────────

function TeamMemberList({
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

  const memberUserIds = new Set(teamMembers?.map((m) => m.user_id) ?? [])
  const available = allMembers.filter((m) => !memberUserIds.has(m.user_id))

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
                  onClick={() =>
                    removeMember.mutate(m.user_id, {
                      onSuccess: () => toast.success("Removed from team"),
                      onError: () => toast.error("Failed to remove"),
                    })
                  }
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
              onClick={() =>
                addMember.mutate(addingUserId, {
                  onSuccess: () => {
                    toast.success("Added to team")
                    setAddingUserId("")
                  },
                  onError: () => toast.error("Failed to add"),
                })
              }
            >
              Add
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Teams tab ─────────────────────────────────────────────────────────────────

function TeamsTab({ workspaceId }: { workspaceId: string }) {
  const { data: teams, isLoading } = useTeams(workspaceId)
  const { data: members } = useWorkspaceMembers(workspaceId)
  const createTeam = useCreateTeam(workspaceId)
  const deleteTeam = useDeleteTeam(workspaceId)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")

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
                        onClick={() =>
                          deleteTeam.mutate(team.id, {
                            onSuccess: () => toast.success("Team deleted"),
                            onError: () => toast.error("Failed to delete team"),
                          })
                        }
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
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const VALID_TABS = ["general", "members", "teams"] as const
type WorkspaceTab = typeof VALID_TABS[number]

export function WorkspaceSettingsPage() {
  const { workspace: wsRef } = useAuth()
  const workspaceId = wsRef?.id ?? ""
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    VALID_TABS.includes(tabParam as WorkspaceTab) ? (tabParam as WorkspaceTab) : "general"
  )

  const handleTabChange = (tab: WorkspaceTab) => {
    setActiveTab(tab)
    setSearchParams({ tab }, { replace: true })
  }
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="p-2">
      <WidgetZone zone="workspace.settings.before" props={{ workspaceId }} />
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">

        {/* Tab nav row */}
        <div className="flex items-center justify-between border-b border-border px-2">
          <div className="flex">
            {(["general", "members", "teams"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={cn(
                  "h-12 px-4 text-sm font-medium border-b-2 transition-colors capitalize",
                  activeTab === tab
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "members" && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" />
              Add member
            </Button>
          )}
        </div>

        {/* Tab content */}
        {activeTab === "general" && <GeneralTab workspaceId={workspaceId} />}
        {activeTab === "members" && (
          <MembersTab workspaceId={workspaceId} onInvite={() => setInviteOpen(true)} />
        )}
        {activeTab === "teams" && <TeamsTab workspaceId={workspaceId} />}
      </div>

      <WidgetZone zone="workspace.settings.after" props={{ workspaceId }} />

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  )
}
