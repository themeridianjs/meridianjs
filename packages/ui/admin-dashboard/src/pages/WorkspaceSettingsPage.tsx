import { useState, useEffect } from "react"
import {
  useWorkspaces,
  useUpdateWorkspace,
  useInvitations,
  useCreateInvitation,
  useRevokeInvitation,
  type Invitation,
} from "@/api/hooks/useWorkspaces"
import { useUsers } from "@/api/hooks/useUsers"
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
import { toast } from "sonner"
import { format } from "date-fns"
import { Users, Copy, Check, Plus, Link2, X, ShieldCheck, UserRound } from "lucide-react"
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

// ── Invite member dialog ──────────────────────────────────────────────────────

interface InviteMemberDialogProps {
  open: boolean
  onClose: () => void
  workspaceId: string
}

function InviteMemberDialog({ open, onClose, workspaceId }: InviteMemberDialogProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null)
  const createInvitation = useCreateInvitation(workspaceId)

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setEmail("")
      setRole("member")
      setCreatedInvitation(null)
    }
  }, [open])

  const inviteUrl = createdInvitation
    ? `${window.location.origin}/invite/${createdInvitation.token}`
    : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createInvitation.mutate(
      { email: email.trim() || undefined, role },
      {
        onSuccess: (data) => {
          setCreatedInvitation(data.invitation)
          toast.success("Invitation created")
        },
        onError: () => toast.error("Failed to create invitation"),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
        </DialogHeader>

        {inviteUrl ? (
          /* ── Success state: show invite link ── */
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Share this link with{" "}
              {createdInvitation?.email ? (
                <span className="font-medium text-foreground">{createdInvitation.email}</span>
              ) : (
                "anyone you want to invite"
              )}
              . They will join as{" "}
              <span className="font-medium text-foreground capitalize">{createdInvitation?.role}</span>.
            </p>

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border overflow-hidden">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-mono text-foreground flex-1 min-w-0 truncate">{inviteUrl}</span>
              <CopyButton value={inviteUrl} className="shrink-0" />
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
        ) : (
          /* ── Form state ── */
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
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
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "member")}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Member</span>
                      <span className="text-xs text-muted-foreground ml-1">— Can view and edit</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Admin</span>
                      <span className="text-xs text-muted-foreground ml-1">— Full access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createInvitation.isPending}
              >
                {createInvitation.isPending ? "Creating…" : "Create invitation"}
              </Button>
            </div>
          </form>
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
      {/* Icon */}
      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Info */}
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

      {/* Date + revoke */}
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
      {/* Section header */}
      <div className="px-6 py-2 border-b border-border bg-muted/20">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Workspace details
        </span>
      </div>

      {/* Name */}
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

      {/* Slug */}
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

      {/* Plan */}
      <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3.5 border-b border-border">
        <span className="text-sm text-muted-foreground">Plan</span>
        {isLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span className="text-sm capitalize">{workspace?.plan ?? "free"}</span>
        )}
      </div>

      {/* Created */}
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
  const { data: users, isLoading: usersLoading } = useUsers()
  const { data: invitations, isLoading: invitationsLoading } = useInvitations(workspaceId)

  const pending = invitations?.filter((i) => i.status === "pending") ?? []

  return (
    <>
      {/* ── Current members ── */}
      <div className="px-6 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Members
          {!usersLoading && users && (
            <span className="ml-2 font-normal normal-case tracking-normal">
              · {users.length}
            </span>
          )}
        </span>
      </div>

      {usersLoading ? (
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
      ) : !users?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">No members yet</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {users.map((user) => {
            const first = user.first_name ?? ""
            const last = user.last_name ?? ""
            const displayName = `${first} ${last}`.trim() || user.email
            const initials = (first[0] ?? last[0] ?? user.email?.[0] ?? "U").toUpperCase()

            return (
              <div key={user.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#f9fafb] dark:hover:bg-muted/30 transition-colors">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[11px] font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export function WorkspaceSettingsPage() {
  const { workspace: wsRef } = useAuth()
  const workspaceId = wsRef?.id ?? ""
  const [activeTab, setActiveTab] = useState<"general" | "members">("general")
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="p-2">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">

        {/* Tab nav row */}
        <div className="flex items-center justify-between border-b border-border px-2">
          <div className="flex">
            {(["general", "members"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
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
              Invite member
            </Button>
          )}
        </div>

        {/* Tab content */}
        {activeTab === "general" && <GeneralTab workspaceId={workspaceId} />}
        {activeTab === "members" && (
          <MembersTab workspaceId={workspaceId} onInvite={() => setInviteOpen(true)} />
        )}
      </div>

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  )
}
