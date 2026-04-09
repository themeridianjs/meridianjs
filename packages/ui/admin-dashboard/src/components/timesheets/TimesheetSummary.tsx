import { formatMinutesLong } from "@/lib/timesheet-utils"

interface TimesheetSummaryProps {
  totalLoggedMinutes: number
  totalExpectedMinutes: number
}

export function TimesheetSummary({ totalLoggedMinutes, totalExpectedMinutes }: TimesheetSummaryProps) {
  return (
    <div className="px-4 pb-2 text-sm text-muted-foreground sm:px-6">
      Spent time{" "}
      <span className="font-medium text-foreground">{formatMinutesLong(totalLoggedMinutes)}</span>
      {" "}of{" "}
      <span className="font-medium text-foreground">{formatMinutesLong(totalExpectedMinutes)}</span>
    </div>
  )
}
