import { useState, useMemo } from "react"
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { useAuth } from "@/stores/auth"
import { useReportingTimeLogs } from "@/api/hooks/useReporting"
import { useOrgCalendar, useHolidays } from "@/api/hooks/useOrgSettings"
import { countBusinessDays } from "@/lib/businessDays"
import {
  WORKING_MINUTES_PER_DAY,
  getMonthGridDates,
  getWeekGridDates,
  groupLogsByDate,
  toDateString,
} from "@/lib/timesheet-utils"
import { TimesheetHeader } from "@/components/timesheets/TimesheetHeader"
import { TimesheetSummary } from "@/components/timesheets/TimesheetSummary"
import { MonthGrid } from "@/components/timesheets/MonthGrid"
import { WeekGrid } from "@/components/timesheets/WeekGrid"
import { AddSpentTimeDialog } from "@/components/timesheets/AddSpentTimeDialog"

interface TimesheetPageProps {
  userId?: string
  readOnly?: boolean
}

export function TimesheetPage({ userId: userIdProp, readOnly }: TimesheetPageProps = {}) {
  const { user } = useAuth()
  const effectiveUserId = userIdProp ?? user?.id
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week">("month")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogDate, setAddDialogDate] = useState<Date | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Compute visible date range for the API query
  const { from, to, gridDates } = useMemo(() => {
    if (view === "month") {
      const dates = getMonthGridDates(year, month)
      return {
        from: toDateString(dates[0]),
        to: toDateString(dates[dates.length - 1]),
        gridDates: dates,
      }
    }
    const dates = getWeekGridDates(currentDate)
    return {
      from: toDateString(dates[0]),
      to: toDateString(dates[dates.length - 1]),
      gridDates: dates,
    }
  }, [year, month, currentDate, view])

  // Fetch time logs for the visible range
  // When viewing another user's data (userIdProp provided), use org_scope to bypass workspace filtering
  const { data: reportingData } = useReportingTimeLogs(
    {
      user_id: effectiveUserId,
      from,
      to,
      limit: 1000,
      org_scope: !!userIdProp,
    },
    { enabled: !!effectiveUserId },
  )

  const timeLogs = reportingData?.time_logs ?? []

  // Fetch org calendar and holidays
  const { data: calendarData } = useOrgCalendar()
  const workingDays = calendarData?.working_days ?? {
    mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false,
  }
  const { data: holidays = [] } = useHolidays(year)

  // Group logs by date
  const logsByDate = useMemo(() => groupLogsByDate(timeLogs), [timeLogs])

  // Compute summary: total logged vs expected for the actual month (not grid overflow)
  const { totalLoggedMinutes, totalExpectedMinutes } = useMemo(() => {
    const monthStart = view === "month" ? startOfMonth(currentDate) : startOfWeek(currentDate)
    const monthEnd = view === "month" ? endOfMonth(currentDate) : endOfWeek(currentDate)
    const bizDays = countBusinessDays(monthStart, monthEnd, workingDays, holidays)
    const expected = bizDays * WORKING_MINUTES_PER_DAY

    let logged = 0
    for (const log of timeLogs) {
      if (!log.logged_date || !log.duration_minutes) continue
      const dateStr = log.logged_date.slice(0, 10)
      const logDate = new Date(dateStr + "T00:00:00")
      if (logDate >= monthStart && logDate <= monthEnd) {
        logged += log.duration_minutes
      }
    }

    return { totalLoggedMinutes: logged, totalExpectedMinutes: expected }
  }, [timeLogs, currentDate, view, workingDays, holidays])

  const handleClickDay = readOnly ? undefined : (date: Date) => {
    setAddDialogDate(date)
    setAddDialogOpen(true)
  }

  const handleAddTime = () => {
    setAddDialogDate(null)
    setAddDialogOpen(true)
  }

  return (
    <div className="p-2 md:h-full">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col md:h-full">
        <TimesheetHeader
          currentDate={currentDate}
          view={view}
          onNavigate={setCurrentDate}
          onViewChange={setView}
          onAddTime={readOnly ? undefined : handleAddTime}
        />
        <TimesheetSummary
          totalLoggedMinutes={totalLoggedMinutes}
          totalExpectedMinutes={totalExpectedMinutes}
        />

        {view === "month" ? (
          <MonthGrid
            dates={gridDates}
            currentDate={currentDate}
            logsByDate={logsByDate}
            workingDays={workingDays}
            holidays={holidays}
            onClickDay={handleClickDay}
          />
        ) : (
          <WeekGrid
            dates={gridDates}
            logsByDate={logsByDate}
            workingDays={workingDays}
            holidays={holidays}
            onClickDay={handleClickDay}
          />
        )}
      </div>

      {!readOnly && (
        <AddSpentTimeDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          defaultDate={addDialogDate}
        />
      )}
    </div>
  )
}
