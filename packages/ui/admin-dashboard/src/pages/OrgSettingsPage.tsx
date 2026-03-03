import { useState, useEffect } from "react"
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
} from "lucide-react"
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
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ── Constants ──────────────────────────────────────────────────────────────────

const DAY_ENTRIES: { key: keyof WorkingDays; label: string; short: string }[] = [
  { key: "mon", label: "Monday",    short: "Mon" },
  { key: "tue", label: "Tuesday",   short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday",  short: "Thu" },
  { key: "fri", label: "Friday",    short: "Fri" },
  { key: "sat", label: "Saturday",  short: "Sat" },
  { key: "sun", label: "Sunday",    short: "Sun" },
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
  const [name, setName]           = useState(holiday?.name ?? "")
  const [date, setDate]           = useState(holiday?.date ? holiday.date.split("T")[0] : "")
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
    if (!date)        { toast.error("Date is required");          return }

    if (holiday) {
      updateHoliday.mutate(
        { id: holiday.id, name: name.trim(), date, recurring },
        {
          onSuccess: () => { toast.success("Holiday updated"); onClose() },
          onError:   () => toast.error("Failed to update holiday"),
        }
      )
    } else {
      createHoliday.mutate(
        { name: name.trim(), date, recurring },
        {
          onSuccess: () => { toast.success("Holiday added"); onClose() },
          onError:   () => toast.error("Failed to add holiday"),
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
        onError:   () => toast.error("Failed to update working days"),
      }
    )
  }

  return (
    <>
      {/* Section header */}
      <div className="px-6 py-2 border-b border-border bg-muted/20">
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
  const [year, setYear]               = useState(new Date().getFullYear())
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [editingHoliday, setEditing]  = useState<OrgHoliday | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgHoliday | null>(null)

  const { data: holidays = [], isLoading } = useHolidays(year)
  const deleteHoliday = useDeleteHoliday()

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteHoliday.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Holiday removed"); setDeleteTarget(null) },
      onError:   () => toast.error("Failed to remove holiday"),
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

      {/* Column headers */}
      <div className="grid grid-cols-[160px_1fr_120px_40px] gap-4 px-6 py-2 border-b border-border bg-muted/20">
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
          return (
            <div
              key={h.id}
              className="grid grid-cols-[160px_1fr_120px_40px] gap-4 items-center px-6 py-3.5 border-b border-border hover:bg-muted/20 transition-colors"
            >
              <span className="text-sm tabular-nums text-muted-foreground">
                {format(d, "MMM d, yyyy")}
              </span>
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
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer"
                      onClick={() => { setEditing(h); setDialogOpen(true) }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(h)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

// ── Page ───────────────────────────────────────────────────────────────────────

type Tab = "working-days" | "holidays"

export function OrgSettingsPage() {
  const [tab, setTab] = useState<Tab>("working-days")

  const tabs: { id: Tab; label: string }[] = [
    { id: "working-days", label: "Working Days" },
    { id: "holidays",     label: "Holidays" },
  ]

  return (
    <div className="p-2 h-full">
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
          {tab === "holidays"     && <HolidaysTab />}
        </div>

      </div>
    </div>
  )
}
