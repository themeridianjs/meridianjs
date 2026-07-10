import {
  useOrgCalendar,
  useUpdateOrgCalendar,
} from "@/api/hooks/useOrgSettings"
import type { WorkingDays } from "@/api/hooks/useOrgSettings"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

export function WorkingDaysTab() {
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
