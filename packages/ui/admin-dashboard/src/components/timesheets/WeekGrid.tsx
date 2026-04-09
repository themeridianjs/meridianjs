import { isSameDay, format } from "date-fns"
import type { TimeLog } from "@/api/hooks/useTimeLogs"
import type { WorkingDays, OrgHoliday } from "@/api/hooks/useOrgSettings"
import { isBusinessDay } from "@/lib/businessDays"
import { toDateString } from "@/lib/timesheet-utils"
import { DayCell } from "./DayCell"
import { TooltipProvider } from "@/components/ui/tooltip"

interface WeekGridProps {
  dates: Date[]
  logsByDate: Map<string, TimeLog[]>
  workingDays: WorkingDays
  holidays: OrgHoliday[]
  onClickDay: (date: Date) => void
}

export function WeekGrid({
  dates,
  logsByDate,
  workingDays,
  holidays,
  onClickDay,
}: WeekGridProps) {
  const today = new Date()

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 min-w-[700px]">
          {/* Day-of-week headers with date */}
          {dates.map((date) => (
            <div
              key={date.toISOString()}
              className="border-r border-b px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30"
            >
              {format(date, "EEE MMM d")}
            </div>
          ))}

          {/* Day cells — single row, taller */}
          {dates.map((date) => {
            const dateStr = toDateString(date)
            const logs = logsByDate.get(dateStr) ?? []
            const isBiz = isBusinessDay(date, workingDays, holidays)
            const holiday = findHoliday(date, holidays)

            return (
              <DayCell
                key={dateStr}
                date={date}
                logs={logs}
                isCurrentMonth
                isToday={isSameDay(date, today)}
                isBusinessDay={isBiz}
                isHoliday={!!holiday}
                holidayName={holiday?.name}
                compact={false}
                onClickDay={onClickDay}
              />
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}

function findHoliday(date: Date, holidays: OrgHoliday[]): OrgHoliday | undefined {
  const month = date.getMonth()
  const day = date.getDate()
  const year = date.getFullYear()

  return holidays.find((h) => {
    const hDate = new Date(h.date)
    if (h.recurring) {
      return hDate.getMonth() === month && hDate.getDate() === day
    }
    return hDate.getFullYear() === year && hDate.getMonth() === month && hDate.getDate() === day
  })
}
