import { useState, useEffect } from "react"
import {
  useCreateHoliday,
  useUpdateHoliday,
  type OrgHoliday,
} from "@/api/hooks/useOrgSettings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface HolidayDialogProps {
  open: boolean
  onClose: () => void
  holiday?: OrgHoliday | null
}

export function HolidayDialog({ open, onClose, holiday }: HolidayDialogProps) {
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
