import { useState, useEffect } from "react"
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  ALL_PERMISSIONS,
  type AppRole,
} from "@/api/hooks/useRoles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { toast } from "sonner"
import { Shield, Lock, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Create role dialog ────────────────────────────────────────────────────────

interface CreateRoleDialogProps {
  open: boolean
  onClose: () => void
}

function CreateRoleDialog({ open, onClose }: CreateRoleDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const createRole = useCreateRole()

  useEffect(() => {
    if (open) {
      setName("")
      setDescription("")
      setPermissions(new Set())
    }
  }, [open])

  const allKeys = ALL_PERMISSIONS.flatMap((g) => g.permissions.map((p) => p.key))
  const allSelected = allKeys.every((k) => permissions.has(k))
  const someSelected = !allSelected && allKeys.some((k) => permissions.has(k))

  const toggleAll = () => {
    if (allSelected) {
      setPermissions(new Set())
    } else {
      setPermissions(new Set(allKeys))
    }
  }

  const togglePermission = (key: string) => {
    setPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createRole.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        permissions: Array.from(permissions),
      },
      {
        onSuccess: () => {
          toast.success("Role created")
          onClose()
        },
        onError: (err: Error) => toast.error(err.message || "Failed to create role"),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
          <DialogDescription>Define a new custom role with a specific permission set.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Developer, PM, Viewer"
              className="h-9"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Description <span className="font-normal">(optional)</span>
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this role for?"
              className="h-9"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Permissions</label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                {allSelected ? "Deselect all" : someSelected ? "Select all" : "Select all"}
              </button>
            </div>
            {ALL_PERMISSIONS.map((group) => (
              <div key={group.group}>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {group.group}
                </p>
                <div className="space-y-1.5">
                  {group.permissions.map((p) => (
                    <label key={p.key} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={permissions.has(p.key)}
                        onChange={() => togglePermission(p.key)}
                        className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
                      />
                      <span className="text-sm group-hover:text-foreground text-muted-foreground transition-colors">
                        {p.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || createRole.isPending}>
              {createRole.isPending ? "Creating…" : "Create role"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Role editor (right panel) ─────────────────────────────────────────────────

interface RoleEditorProps {
  role: AppRole
  onDeleted: () => void
}

function RoleEditor({ role, onDeleted }: RoleEditorProps) {
  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description ?? "")
  const [permissions, setPermissions] = useState<Set<string>>(new Set(role.permissions))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const updateRole = useUpdateRole(role.id)
  const deleteRole = useDeleteRole()

  // Reset form when role changes
  useEffect(() => {
    setName(role.name)
    setDescription(role.description ?? "")
    setPermissions(new Set(role.permissions))
  }, [role.id, role.name, role.description, role.permissions])

  const isDirty =
    name !== role.name ||
    description !== (role.description ?? "") ||
    permissions.size !== role.permissions.length ||
    Array.from(permissions).some((p) => !role.permissions.includes(p))

  const allKeys = ALL_PERMISSIONS.flatMap((g) => g.permissions.map((p) => p.key))
  const allSelected = allKeys.every((k) => permissions.has(k))
  const someSelected = !allSelected && allKeys.some((k) => permissions.has(k))

  const toggleAll = () => {
    if (allSelected) {
      setPermissions(new Set())
    } else {
      setPermissions(new Set(allKeys))
    }
  }

  const togglePermission = (key: string) => {
    setPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSave = () => {
    updateRole.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        permissions: Array.from(permissions),
      },
      {
        onSuccess: () => toast.success("Role saved"),
        onError: (err: Error) => toast.error(err.message || "Failed to save role"),
      }
    )
  }

  const handleDelete = () => {
    deleteRole.mutate(role.id, {
      onSuccess: () => {
        toast.success("Role deleted")
        onDeleted()
        setConfirmDelete(false)
      },
      onError: (err: Error) => toast.error(err.message || "Failed to delete role"),
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{role.name}</h2>
          {role.is_system && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              <Lock className="h-3 w-3" />
              System
            </span>
          )}
        </div>
        {!role.is_system && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Delete role"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this role for?"
            className="h-8 text-sm"
          />
        </div>

        {/* Permission groups */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Permissions</span>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            {allSelected ? "Deselect all" : someSelected ? "Select all" : "Select all"}
          </button>
        </div>
        {ALL_PERMISSIONS.map((group) => (
          <div key={group.group}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {group.group}
            </p>
            <div className="space-y-2">
              {group.permissions.map((p) => (
                <label key={p.key} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={permissions.has(p.key)}
                    onChange={() => togglePermission(p.key)}
                    className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {p.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save footer */}
      <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || !name.trim() || updateRole.isPending}
        >
          {updateRole.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{role.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This role will be removed from all users assigned to it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RolesPage() {
  const { data: roles, isLoading } = useRoles()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const systemRoles = roles?.filter((r) => r.is_system) ?? []
  const customRoles = roles?.filter((r) => !r.is_system) ?? []

  // Auto-select first role on load
  useEffect(() => {
    if (roles && roles.length > 0 && !selectedId) {
      setSelectedId(roles[0].id)
    }
  }, [roles])

  const selectedRole = roles?.find((r) => r.id === selectedId) ?? null

  return (
    <div className="p-2 h-full">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">
        {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-base font-semibold">Roles & Permissions</h1>
            <p className="text-xs text-muted-foreground">
              Define what users with each custom role can do across the application.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create role
        </Button>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: role list */}
        <div className="w-56 shrink-0 border-r border-border flex flex-col overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <>
              {systemRoles.length > 0 && (
                <div>
                  <div className="px-3 pt-3 pb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      System Roles
                    </span>
                  </div>
                  {systemRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedId(role.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                        selectedId === role.id
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{role.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {customRoles.length > 0 && (
                <div>
                  <div className="px-3 pt-3 pb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Custom Roles
                    </span>
                  </div>
                  {customRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedId(role.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                        selectedId === role.id
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <div className="h-3 w-3 shrink-0" />
                      <span className="truncate">{role.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {!isLoading && (!roles || roles.length === 0) && (
                <div className="flex flex-col items-center justify-center py-10 px-3 text-center">
                  <p className="text-xs text-muted-foreground">No roles yet.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right panel: editor */}
        <div className="flex-1 min-w-0">
          {selectedRole ? (
            <RoleEditor
              key={selectedRole.id}
              role={selectedRole}
              onDeleted={() => {
                const remaining = roles?.filter((r) => r.id !== selectedRole.id) ?? []
                setSelectedId(remaining[0]?.id ?? null)
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center p-8">
              <div>
                <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">Select a role to edit</p>
                <p className="text-xs text-muted-foreground">
                  Or{" "}
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    create a new role
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateRoleDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      </div>
    </div>
  )
}
