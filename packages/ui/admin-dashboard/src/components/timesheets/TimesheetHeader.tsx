import { format, addMonths, subMonths, addWeeks, subWeeks } from "date-fns"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TimesheetHeaderProps {
  currentDate: Date
  view: "month" | "week"
  onNavigate: (date: Date) => void
  onViewChange: (view: "month" | "week") => void
  onAddTime?: () => void
}

export function TimesheetHeader({
  currentDate,
  view,
  onNavigate,
  onViewChange,
  onAddTime,
}: TimesheetHeaderProps) {
  const title = format(currentDate, "MMMM yyyy")

  const handlePrev = () => {
    onNavigate(view === "month" ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))
  }

  const handleNext = () => {
    onNavigate(view === "month" ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))
  }

  const handleToday = () => {
    onNavigate(new Date())
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-2 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center rounded-md border bg-muted/40 p-0.5">
          <button
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              view === "week"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onViewChange("week")}
          >
            Week
          </button>
          <button
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              view === "month"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onViewChange("month")}
          >
            Month
          </button>
        </div>

        {onAddTime && (
          <Button size="sm" className="h-8 gap-1.5" onClick={onAddTime}>
            <Plus className="h-3.5 w-3.5" />
            Add spent time
          </Button>
        )}
      </div>
    </div>
  )
}
