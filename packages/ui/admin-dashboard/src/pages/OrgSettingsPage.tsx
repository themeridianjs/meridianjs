import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { format } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  CalendarDays,
  MoreHorizontal,
  Users,
  Link2,
  X,
  Copy,
  Check,
  UserX,
  UserCheck,
  RotateCw,
} from "lucide-react"
import { useUsers, useDeactivateUser, useReactivateUser, useUpdateUserGlobalRole, useInviteOrgMember, useOrgInvitations, useRevokeOrgInvitation, useResendOrgInvitation, type OrgInvitation } from "@/api/hooks/useUsers"
import { useMe } from "@/api/hooks/useProfile"
import { useRoles, useAssignUserRole } from "@/api/hooks/useRoles"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useOrgCalendar,
  useUpdateOrgCalendar,
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
} from "@/api/hooks/useOrgSettings"
import type { WorkingDays, OrgHoliday } from "@/api/hooks/useOrgSettings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ── Constants ──────────────────────────────────────────────────────────────────

const DAY_ENTRIES: { key: keyof WorkingDays; label: string; short: string }[] = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
]

const DEFAULT_WORKING_DAYS: WorkingDays = {
  mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false,
}

// ── Holiday dialog ─────────────────────────────────────────────────────────────

interface HolidayDialogProps {
  open: boolean
  onClose: () => void
  holiday?: OrgHoliday | null
}

function HolidayDialog({ open, onClose, holiday }: HolidayDialogProps) {
  const [name, setName] = useState(holiday?.name ?? "")
  const [date, setDate] = useState(holiday?.date ? holiday.date.split("T")[0] : "")
  const [recurring, setRecurring] = useState(holiday?.recurring ?? false)

  useEffect(() => {
    if (open) {
      setName(holiday?.name ?? "")
      setDate(holiday?.date ? holiday.date.split("T")[0] : "")
      setRecurring(holiday?.recurring ?? false)
    }
  }, [open, holiday?.id])

  const createHoliday = useCreateHoliday()
  const updateHoliday = useUpdateHoliday()
  const isPending = createHoliday.isPending || updateHoliday.isPending

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error("Holiday name is required"); return }
    if (!date) { toast.error("Date is required"); return }

    if (holiday) {
      updateHoliday.mutate(
        { id: holiday.id, name: name.trim(), date, recurring },
        {
          onSuccess: () => { toast.success("Holiday updated"); onClose() },
          onError: () => toast.error("Failed to update holiday"),
        }
      )
    } else {
      createHoliday.mutate(
        { name: name.trim(), date, recurring },
        {
          onSuccess: () => { toast.success("Holiday added"); onClose() },
          onError: () => toast.error("Failed to add holiday"),
        }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{holiday ? "Edit holiday" : "Add holiday"}</DialogTitle>
          <DialogDescription>
            Holidays are excluded from business day calculations across the app.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New Year's Day"
              className="h-9"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9"
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={recurring}
              onCheckedChange={(v: boolean) => setRecurring(v)}
            />
            <span className="text-sm text-muted-foreground">
              Recurring annually (applies every year on the same date)
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (holiday ? "Saving…" : "Adding…") : (holiday ? "Save changes" : "Add holiday")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Working days tab ───────────────────────────────────────────────────────────

function WorkingDaysTab() {
  const { data: calendar, isLoading } = useOrgCalendar()
  const updateCalendar = useUpdateOrgCalendar()

  const workingDays = calendar?.working_days ?? DEFAULT_WORKING_DAYS

  const handleToggle = (key: keyof WorkingDays, checked: boolean) => {
    const updated = { ...workingDays, [key]: checked }
    updateCalendar.mutate(
      { working_days: updated },
      {
        onSuccess: () => toast.success("Working days updated"),
        onError: () => toast.error("Failed to update working days"),
      }
    )
  }

  return (
    <>
      {/* Section header */}
      <div className="px-6 py-2 border-b border-border bg-muted/20 min-h-[45px] flex items-center">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Working days
        </span>
      </div>

      <div className="px-6 py-2 border-b border-border bg-muted/10">
        <p className="text-xs text-muted-foreground">
          Configure which days count as business days. This affects duration calculations across the app.
        </p>
      </div>

      {/* Day rows */}
      {isLoading ? (
        <div className="px-6 py-4 space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        DAY_ENTRIES.map(({ key, label }) => {
          const isWorking = workingDays[key]
          return (
            <div
              key={key}
              className="grid grid-cols-[180px_1fr_auto] items-center gap-4 px-6 py-3.5 border-b border-border"
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <span
                className={cn(
                  "text-xs font-medium",
                  isWorking ? "text-foreground" : "text-muted-foreground/60"
                )}
              >
                {isWorking ? "Working day" : "Not a working day"}
              </span>
              <Switch
                checked={isWorking}
                onCheckedChange={(v: boolean) => handleToggle(key, v)}
                disabled={updateCalendar.isPending}
              />
            </div>
          )
        })
      )}
    </>
  )
}

// ── Holidays tab ───────────────────────────────────────────────────────────────

function HolidaysTab() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingHoliday, setEditing] = useState<OrgHoliday | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgHoliday | null>(null)

  const { data: holidays = [], isLoading } = useHolidays(year)
  const deleteHoliday = useDeleteHoliday()

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteHoliday.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Holiday removed"); setDeleteTarget(null) },
      onError: () => toast.error("Failed to remove holiday"),
    })
  }

  const sorted = [...holidays].sort((a, b) => {
    const ma = new Date(a.date).getMonth() * 100 + new Date(a.date).getDate()
    const mb = new Date(b.date).getMonth() * 100 + new Date(b.date).getDate()
    return ma - mb
  })

  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-muted/20">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Holidays
        </span>
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="h-3.5 w-3.5" />
          Add holiday
        </Button>
      </div>

      {/* Year navigation */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-border bg-muted/10">
        <p className="text-xs text-muted-foreground flex-1">
          Showing holidays for{" "}
          <span className="font-medium text-foreground">{year}</span>.
          Recurring holidays appear every year.
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-medium tabular-nums w-10 text-center">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Column headers — desktop only */}
      <div className="hidden md:grid grid-cols-[160px_1fr_120px_40px] gap-4 px-6 py-2 border-b border-border bg-muted/20">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Date</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Name</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Recurrence</span>
        <span />
      </div>

      {/* Rows */}
      {isLoading ? (
        <div className="px-6 py-4 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium mb-1">No holidays for {year}</p>
          <p className="text-xs text-muted-foreground mb-3">
            Add a holiday or use the year navigation to view other years.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={() => { setEditing(null); setDialogOpen(true) }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add holiday
          </Button>
        </div>
      ) : (
        sorted.map((h) => {
          const d = new Date(h.date)
          const actionsMenu = (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => { setEditing(h); setDialogOpen(true) }}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteTarget(h)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
          return (
            <div key={h.id}>
              {/* Desktop row */}
              <div className="hidden md:grid grid-cols-[160px_1fr_120px_40px] gap-4 items-center px-6 py-3.5 border-b border-border hover:bg-muted/20 transition-colors">
                <span className="text-sm tabular-nums text-muted-foreground">{format(d, "MMM d, yyyy")}</span>
                <span className="text-sm font-medium truncate">{h.name}</span>
                <span className="text-sm">
                  {h.recurring ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <RefreshCw className="h-3 w-3" />
                      Every year
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">One-time</span>
                  )}
                </span>
                <div className="flex justify-end">{actionsMenu}</div>
              </div>
              {/* Mobile card */}
              <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{h.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground tabular-nums">{format(d, "MMM d, yyyy")}</span>
                    {h.recurring && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <RefreshCw className="h-3 w-3" />
                        Recurring
                      </span>
                    )}
                  </div>
                </div>
                {actionsMenu}
              </div>
            </div>
          )
        })
      )}

      {/* Dialogs */}
      <HolidayDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
        holiday={editingHoliday}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This holiday will no longer be excluded from business day calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Members tab ────────────────────────────────────────────────────────────────

const GLOBAL_ROLES = ["super-admin", "admin", "member"] as const

const ROLE_BADGE: Record<string, string> = {
  "super-admin": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "admin": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "member": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  revoked: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      title="Copy"
    >
      {copied
        ? <Check className="h-3.5 w-3.5 text-emerald-500" />
        : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

const ROLE_RANK: Record<string, number> = {
  "super-admin": 3,
  "admin": 2,
  "moderator": 1,
  "member": 0,
}

const PAGE_SIZE = 20

function MembersTab() {
  const { data: me } = useMe()
  const myRank = ROLE_RANK[me?.role ?? "member"] ?? 0
  const { data: users = [], isLoading: usersLoading } = useUsers()
  const { data: invitations = [], isLoading: invitationsLoading } = useOrgInvitations()
  const { data: roles = [] } = useRoles()
  const assignRole = useAssignUserRole()
  const updateGlobalRole = useUpdateUserGlobalRole()
  const deactivateUser = useDeactivateUser()
  const reactivateUser = useReactivateUser()
  const revokeInvitation = useRevokeOrgInvitation()
  const resendInvitation = useResendOrgInvitation()
  const inviteMember = useInviteOrgMember()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<OrgInvitation | null>(null)
  const [resendTarget, setResendTarget] = useState<OrgInvitation | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [page, setPage] = useState(0)

  const pendingInvitations = useMemo(
    () => invitations.filter((inv) => inv.status === "pending"),
    [invitations]
  )

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => {
      const nameA = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || a.email
      const nameB = `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim() || b.email
      return nameA.localeCompare(nameB)
    }),
    [users]
  )

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    inviteMember.mutate(
      { email: inviteEmail.trim().toLowerCase(), role: inviteRole },
      {
        onSuccess: () => {
          toast.success(`Invitation sent to ${inviteEmail.trim()}`)
          setInviteOpen(false)
          setInviteEmail("")
          setInviteRole("member")
        },
        onError: (err: any) => toast.error(err?.message ?? "Failed to send invitation"),
      }
    )
  }

  const handleDeactivate = () => {
    if (!deleteTarget) return
    deactivateUser.mutate(deleteTarget, {
      onSuccess: () => { toast.success("User deactivated"); setDeleteTarget(null) },
      onError: () => toast.error("Failed to deactivate user"),
    })
  }

  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-muted/20">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          All users
          {!usersLoading && users.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[11px] font-medium rounded-full">
              {users.length}
            </Badge>
          )}
        </span>
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setInviteOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Invite member
        </Button>
      </div>

      <div className="px-6 py-2 border-b border-border bg-muted/10">
        <p className="text-xs text-muted-foreground">
          View and manage all platform users. Change a user's custom role or remove them from the system.
        </p>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={(v) => { if (!v) { setInviteOpen(false); setInviteEmail(""); setInviteRole("member") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-9"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GLOBAL_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-sm capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              The user will receive an invite link to create their account. They won't be added to any workspace automatically — you can add them from workspace settings after they join.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={inviteMember.isPending}>
                {inviteMember.isPending ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Column headers — desktop only */}
      <div className="hidden md:grid grid-cols-[1fr_160px_200px_40px] gap-4 px-6 py-2 border-b border-border bg-muted/20">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">User</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Global role</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Custom role</span>
        <span />
      </div>

      {usersLoading ? (
        <div className="px-6 py-4 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No users found</p>
        </div>
      ) : (
        <>
          {sortedUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((user) => {
            const first = user.first_name ?? ""
            const last = user.last_name ?? ""
            const name = `${first} ${last}`.trim() || user.email
            const initials = (first[0] ?? last[0] ?? user.email?.[0] ?? "U").toUpperCase()
            const userRank = ROLE_RANK[user.role ?? "member"] ?? 0
            const isSelf = user.id === me?.id
            const canManage = !isSelf && userRank < myRank

            const globalRoleSelect = !canManage ? (
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", ROLE_BADGE[user.role ?? "member"] ?? ROLE_BADGE.member)}>
                {user.role ?? "member"}
              </span>
            ) : (
              <Select
                value={user.role ?? "member"}
                onValueChange={(val) =>
                  updateGlobalRole.mutate(
                    { userId: user.id, role: val },
                    {
                      onSuccess: () => toast.success("Global role updated"),
                      onError: (err: any) => toast.error(err?.message ?? "Failed to update global role"),
                    }
                  )
                }
              >
                <SelectTrigger className="h-7 text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GLOBAL_ROLES.filter((r) => (ROLE_RANK[r] ?? 0) <= myRank).map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium", ROLE_BADGE[r])}>
                        {r}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )

            const appRoleSelect = (
              <Select
                value={user.app_role_id ?? "none"}
                disabled={!canManage}
                onValueChange={(val) =>
                  assignRole.mutate(
                    { userId: user.id, appRoleId: val === "none" ? null : val },
                    {
                      onSuccess: () => toast.success("Custom role updated"),
                      onError: () => toast.error("Failed to update custom role"),
                    }
                  )
                }
              >
                <SelectTrigger className={cn("h-7 text-xs w-full", !canManage && "opacity-60 cursor-not-allowed")}>
                  <SelectValue placeholder="No role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">No role</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )

            const isActive = (user as any).is_active !== false

            const actionsMenu = canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {isActive ? (
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(user.id)}
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Deactivate user
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer"
                      onClick={() => {
                        reactivateUser.mutate(user.id, {
                          onSuccess: () => toast.success("User reactivated"),
                          onError: () => toast.error("Failed to reactivate user"),
                        })
                      }}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Reactivate user
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null

            return (
              <div key={user.id} className="border-b border-border hover:bg-muted/20 transition-colors group">
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[1fr_160px_200px_40px] gap-4 items-center px-6 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {name}
                        {isSelf && <span className="text-xs text-muted-foreground ml-1.5">(you)</span>}
                        {!isActive && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Deactivated</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  {globalRoleSelect}
                  {appRoleSelect}
                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {actionsMenu}
                  </div>
                </div>

                {/* Mobile row */}
                <div className="md:hidden px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0 mb-2">
                    <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {name}
                        {isSelf && <span className="text-xs text-muted-foreground ml-1.5">(you)</span>}
                        {!isActive && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Deactivated</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {actionsMenu}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">{globalRoleSelect}</div>
                    <div className="flex-1">{appRoleSelect}</div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {sortedUsers.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sortedUsers.length)} of {sortedUsers.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums w-12 text-center">
                  {page + 1} / {Math.ceil(sortedUsers.length / PAGE_SIZE)}
                </span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= sortedUsers.length}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Invitations section ────────────────────────────────────────────── */}
      <div className="px-6 py-2 border-b border-border bg-muted/20 mt-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          Invitations
          {!invitationsLoading && pendingInvitations.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[11px] font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {pendingInvitations.length}
            </Badge>
          )}
        </span>
      </div>

      {invitationsLoading ? (
        <div className="px-6 py-4 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : pendingInvitations.length === 0 ? (
        <div className="px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground">No pending invitations.</p>
        </div>
      ) : (
        pendingInvitations.map((inv) => {
          const inviteUrl = `${window.location.origin}/invite/${inv.token}`
          return (
            <div
              key={inv.id}
              className="flex items-center gap-3 px-6 py-3.5 border-b border-border hover:bg-muted/20 transition-colors group"
            >
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {inv.email ?? "Shareable link"}
                  </p>
                  <span className={cn(
                    "inline-flex items-center text-[11px] px-1.5 py-0.5 rounded font-medium",
                    inv.role === "super-admin"
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
                      : inv.role === "admin"
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {inv.role === "super-admin" ? "Super Admin" : inv.role === "admin" ? "Admin" : "Member"}
                  </span>
                  {inv.workspace_name && (
                    <span className="text-[11px] text-muted-foreground truncate">
                      · {inv.workspace_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-muted-foreground truncate max-w-[320px]">
                    {inviteUrl}
                  </span>
                  <CopyButton value={inviteUrl} />
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium", STATUS_BADGE[inv.status] ?? STATUS_BADGE.revoked)}>
                  {inv.status}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {format(new Date(inv.created_at), "MMM d")}
                </span>
                {inv.status === "pending" && inv.email && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setResendTarget(inv)}
                        disabled={resendInvitation.isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        <RotateCw className={cn("h-3.5 w-3.5", resendInvitation.isPending && "animate-spin")} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Resend invite</TooltipContent>
                  </Tooltip>
                )}
                {inv.status === "pending" && (
                  <button
                    onClick={() => setRevokeTarget(inv)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    title="Revoke invitation"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Deactivate user dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this user?</AlertDialogTitle>
            <AlertDialogDescription>
              The user will lose access immediately and be hidden from member lists. You can reactivate them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke invitation dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(v) => !v && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The invite link sent to <span className="font-medium">{revokeTarget?.email}</span> will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!revokeTarget) return
                revokeInvitation.mutate(revokeTarget.id, {
                  onSuccess: () => { toast.success("Invitation revoked"); setRevokeTarget(null) },
                  onError: () => toast.error("Failed to revoke invitation"),
                })
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resend invitation dialog */}
      <AlertDialog open={!!resendTarget} onOpenChange={(v) => !v && setResendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              A new invitation email will be sent to <span className="font-medium">{resendTarget?.email}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!resendTarget) return
                resendInvitation.mutate(resendTarget.id, {
                  onSuccess: () => { toast.success("Invitation resent"); setResendTarget(null) },
                  onError: () => toast.error("Failed to resend invitation"),
                })
              }}
            >
              Resend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Tab = "working-days" | "holidays" | "members"

const VALID_TABS: Tab[] = ["working-days", "holidays", "members"]

export function OrgSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get("tab") as Tab | null
  const tab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : "working-days"

  const setTab = (id: Tab) => setSearchParams({ tab: id }, { replace: true })

  const tabs: { id: Tab; label: string }[] = [
    { id: "working-days", label: "Working Days" },
    { id: "holidays", label: "Holidays" },
    { id: "members", label: "Members" },
  ]

  return (
    <div className="p-2 pb-24 md:pb-2 h-full">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">

        {/* Page header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="text-base font-semibold">Organization Settings</h1>
              <p className="text-xs text-muted-foreground">
                Global configuration that applies across the entire Meridian deployment.
              </p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border shrink-0 px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-1 py-3 mr-6 text-sm font-medium border-b-2 transition-colors",
                tab === t.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "working-days" && <WorkingDaysTab />}
          {tab === "holidays" && <HolidaysTab />}
          {tab === "members" && <MembersTab />}
        </div>

      </div>
    </div>
  )
}
