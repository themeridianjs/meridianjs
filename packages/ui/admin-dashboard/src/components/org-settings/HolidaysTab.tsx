import { useState } from "react"
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
  useHolidays,
  useDeleteHoliday,
  type OrgHoliday,
} from "@/api/hooks/useOrgSettings"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import { HolidayDialog } from "./HolidayDialog"

export function HolidaysTab() {
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
