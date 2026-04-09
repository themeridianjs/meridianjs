import type { TimeLog } from "@/api/hooks/useTimeLogs"
import { formatMinutes } from "@/lib/time-utils"
import { WORKING_HOURS_PER_DAY, projectIdentifierToColor } from "@/lib/timesheet-utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface DayCellProps {
  date: Date
  logs: TimeLog[]
  isCurrentMonth: boolean
  isToday: boolean
  isBusinessDay: boolean
  isHoliday: boolean
  holidayName?: string
  compact: boolean
  onClickDay?: (date: Date) => void
}

export function DayCell({
  date,
  logs,
  isCurrentMonth,
  isToday,
  isBusinessDay,
  isHoliday,
  holidayName,
  compact,
  onClickDay,
}: DayCellProps) {
  const dayNum = date.getDate()
  const totalMinutes = logs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0)
  const expectedHours = isBusinessDay ? WORKING_HOURS_PER_DAY : 0
  const expectedMinutes = expectedHours * 60

  // Determine badge style
  let badgeClass = "text-muted-foreground bg-muted/60"
  if (expectedMinutes > 0 && totalMinutes > 0) {
    badgeClass =
      totalMinutes >= expectedMinutes
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
  }

  // Determine cell background
  let cellBg = ""
  if (isHoliday) {
    cellBg = "bg-amber-50/50 dark:bg-amber-950/10"
  } else if (!isBusinessDay) {
    cellBg = "bg-muted/20"
  }

  const maxVisible = compact ? 3 : 8

  // Aggregate logs per issue identifier for display
  const aggregated = aggregateLogs(logs)
  const visibleAgg = aggregated.slice(0, maxVisible)
  const aggOverflow = aggregated.length - maxVisible

  return (
    <div
      className={`relative flex flex-col border-r border-b p-1.5 ${cellBg} ${
        !isCurrentMonth ? "opacity-40" : ""
      } ${isToday ? "ring-2 ring-inset ring-indigo-500/40" : ""} ${
        compact ? "min-h-[100px]" : "min-h-[180px]"
      } cursor-pointer hover:bg-accent/30 transition-colors`}
      onClick={() => onClickDay?.(date)}
    >
      {/* Header row: day number + hours badge */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <span
          className={`text-sm font-medium leading-none ${
            isToday
              ? "flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs"
              : ""
          }`}
        >
          {dayNum}
        </span>
        {(totalMinutes > 0 || expectedHours > 0) && (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium leading-none ${badgeClass}`}
          >
            {formatMinutes(totalMinutes)} of {expectedHours}h
          </span>
        )}
      </div>

      {/* Holiday name */}
      {isHoliday && holidayName && (
        <span className="text-xs text-amber-600 dark:text-amber-400 truncate mb-0.5">
          {holidayName}
        </span>
      )}

      {/* Issue chips */}
      <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
        {visibleAgg.map((entry) => (
          <Tooltip key={entry.key}>
            <TooltipTrigger asChild>
              <div
                className={`rounded px-1.5 py-1 text-xs font-medium leading-tight truncate ${entry.colorClass}`}
              >
                {entry.identifier}
                {entry.totalMinutes > 0 && (
                  <span className="ml-1 opacity-70">{formatMinutes(entry.totalMinutes)}</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{entry.identifier}</p>
              {entry.title && <p className="text-muted-foreground">{entry.title}</p>}
              <p>{formatMinutes(entry.totalMinutes)}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {aggOverflow > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground px-1.5">
                +{aggOverflow} more
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px]">
              {aggregated.slice(maxVisible).map((e) => (
                <div key={e.key}>
                  {e.identifier} — {formatMinutes(e.totalMinutes)}
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

interface AggregatedEntry {
  key: string
  identifier: string
  title: string | null
  projectIdentifier: string | null
  totalMinutes: number
  colorClass: string
}

function aggregateLogs(logs: TimeLog[]): AggregatedEntry[] {
  const map = new Map<string, AggregatedEntry>()
  for (const log of logs) {
    const id = log.issue_identifier ?? log.issue_id
    const existing = map.get(id)
    if (existing) {
      existing.totalMinutes += log.duration_minutes ?? 0
    } else {
      map.set(id, {
        key: id,
        identifier: log.issue_identifier ?? "Unknown",
        title: log.issue_title ?? null,
        projectIdentifier: log.project_identifier ?? null,
        totalMinutes: log.duration_minutes ?? 0,
        colorClass: projectIdentifierToColor(log.project_identifier ?? log.project_id ?? ""),
      })
    }
  }
  return Array.from(map.values())
}
