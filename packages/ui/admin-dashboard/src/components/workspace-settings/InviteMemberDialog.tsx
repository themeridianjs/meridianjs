import React, { useState, useEffect, useMemo } from "react"
import {
  useWorkspaceMembers,
  useAddWorkspaceMembersBatch,
  useCreateInvitation,
  type Invitation,
} from "@/api/hooks/useWorkspaces"
import { useUsers } from "@/api/hooks/useUsers"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { useRoles, type AppRole } from "@/api/hooks/useRoles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Check, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { CopyButton } from "./CopyButton"

type DialogMode = "existing" | "invite"

interface InviteMemberDialogProps {
  open: boolean
  onClose: () => void
  workspaceId: string
}

function AppRoleSelect({
  value,
  onChange,
  appRoles,
}: {
  value: string
  onChange: (v: string) => void
  appRoles: AppRole[] | undefined
}) {
  if (!appRoles || appRoles.length === 0) return null

  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="No custom role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">No custom role</span>
        </SelectItem>
        {appRoles.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            <div className="flex flex-col">
              <span>{r.name}</span>
              {r.description && (
                <span className="text-xs text-muted-foreground">{r.description}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function InviteMemberDialog({ open, onClose, workspaceId }: InviteMemberDialogProps) {
  const [mode, setMode] = useState<DialogMode>("existing")
  // Existing-user mode state
  const [search, setSearch] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [addAppRoleId, setAddAppRoleId] = useState<string>("")
  // Invite mode state
  const [email, setEmail] = useState("")
  const [inviteAppRoleId, setInviteAppRoleId] = useState<string>("")
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const { data: allUsersData, isFetching: isSearching } = useUsers({ q: debouncedSearch })
  const allUsers = allUsersData?.users ?? []
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const addMembersBatch = useAddWorkspaceMembersBatch(workspaceId)
  const createInvitation = useCreateInvitation(workspaceId)
  const { data: appRoles } = useRoles()

  const memberUserIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members])
  const nonMembers = useMemo(
    () => allUsers.filter((u) => !memberUserIds.has(u.id)),
    [allUsers, memberUserIds]
  )

  useEffect(() => {
    if (open) {
      setSearch("")
      setSelectedUserIds([])
      setAddAppRoleId("")
      setEmail("")
      setInviteAppRoleId("")
      setCreatedInvitation(null)
      setMode("existing")
    }
  }, [open])

  const handleAddExisting = () => {
    if (selectedUserIds.length === 0) return
    addMembersBatch.mutate(
      { user_ids: selectedUserIds, role: "member", app_role_id: addAppRoleId || null },
      {
        onSuccess: (data) => {
          toast.success(`${data.added} member${data.added === 1 ? "" : "s"} added`)
          onClose()
        },
        onError: (err: Error) => toast.error(err.message || "Failed to add members"),
      }
    )
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    createInvitation.mutate(
      {
        email: email.trim() || undefined,
        role: "member",
        app_role_id: inviteAppRoleId || null,
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
      <DialogContent className="sm:max-w-[520px] bg-white dark:bg-card">
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
              {isSearching && search !== debouncedSearch ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">Searching…</p>
                </div>
              ) : nonMembers.length === 0 && search.trim() ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No users match "{search}"</p>
                </div>
              ) : nonMembers.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <p className="text-sm text-muted-foreground">All users are already members.</p>
                  <button
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    onClick={() => setMode("invite")}
                  >
                    Send an invite instead
                  </button>
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto divide-y divide-border">
                  {nonMembers.map((u) => {
                    const first = u.first_name ?? ""
                    const last = u.last_name ?? ""
                    const displayName = `${first} ${last}`.trim() || u.email
                    const initials = (first[0] ?? last[0] ?? u.email[0] ?? "U").toUpperCase()
                    const isSelected = selectedUserIds.includes(u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() =>
                          setSelectedUserIds((prev) =>
                            isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }
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
                {appRoles && appRoles.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Role <span className="font-normal">(optional)</span>
                    </label>
                    <AppRoleSelect value={addAppRoleId} onChange={setAddAppRoleId} appRoles={appRoles} />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={selectedUserIds.length === 0 || addMembersBatch.isPending}
                    onClick={handleAddExisting}
                  >
                    {addMembersBatch.isPending
                      ? "Adding…"
                      : selectedUserIds.length <= 1
                        ? "Add to workspace"
                        : `Add ${selectedUserIds.length} members`}
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
            {appRoles && appRoles.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Role <span className="font-normal">(optional)</span>
                </label>
                <AppRoleSelect value={inviteAppRoleId} onChange={setInviteAppRoleId} appRoles={appRoles} />
              </div>
            )}
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
              .
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
