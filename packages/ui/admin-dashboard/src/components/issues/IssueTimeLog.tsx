import { useState, useEffect } from "react"
import { format } from "date-fns"
import {
  useTimeLogs,
  useActiveTimer,
  useLogTime,
  useStartTimer,
  useStopTimer,
  useDeleteTimeLog,
} from "@/api/hooks/useTimeLogs"
import type { TimeLog } from "@/api/hooks/useTimeLogs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Clock, Play, Square, Plus, Trash2, Timer, ClipboardList,
} from "lucide-react"
import { toast } from "sonner"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatElapsed(startedAt: string): string {
  const elapsedMs = Date.now() - new Date(startedAt).getTime()
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// ── Live elapsed counter ──────────────────────────────────────────────────────

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(startedAt))

  useEffect(() => {
    const id = setInterval(() => setElapsed(formatElapsed(startedAt)), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <span className="font-mono tabular-nums text-sm font-semibold text-foreground">
      {elapsed}
    </span>
  )
}

// ── Log time form ─────────────────────────────────────────────────────────────

interface LogTimeFormProps {
  onSubmit: (input: { duration_minutes: number; description?: string; logged_date?: string }) => void
  isPending: boolean
  onCancel: () => void
}

function LogTimeForm({ onSubmit, isPending, onCancel }: LogTimeFormProps) {
  const [hours, setHours] = useState("")
  const [minutes, setMinutes] = useState("")
  const [description, setDescription] = useState("")
  const [loggedDate, setLoggedDate] = useState(
    new Date().toISOString().split("T")[0]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const h = parseInt(hours || "0", 10)
    const m = parseInt(minutes || "0", 10)
    const total = h * 60 + m
    if (total <= 0) {
      toast.error("Please enter a duration greater than 0.")
      return
    }
    onSubmit({
      duration_minutes: total,
      description: description.trim() || undefined,
      logged_date: loggedDate || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-xs font-medium text-foreground">Log time manually</p>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] text-muted-foreground mb-1 block">Hours</label>
          <Input
            type="number"
            min="0"
            max="999"
            placeholder="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-[11px] text-muted-foreground mb-1 block">Minutes</label>
          <Input
            type="number"
            min="0"
            max="59"
            placeholder="0"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-[11px] text-muted-foreground mb-1 block">Date</label>
          <Input
            type="date"
            value={loggedDate}
            onChange={(e) => setLoggedDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">
          Description <span className="text-muted-foreground/60">(optional)</span>
        </label>
        <Input
          placeholder="What did you work on?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending} className="h-7 text-xs">
          {isPending ? "Saving…" : "Log time"}
        </Button>
      </div>
    </form>
  )
}

// ── Time log row ──────────────────────────────────────────────────────────────

function TimeLogRow({
  entry,
  onDelete,
  isDeleting,
}: {
  entry: TimeLog
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const isActive = entry.started_at != null && entry.stopped_at == null

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 group transition-colors">
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5",
        isActive ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-muted"
      )}>
        {isActive
          ? <Timer className="h-3.5 w-3.5 text-emerald-600" />
          : entry.source === "timer"
            ? <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            : <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isActive ? (
            <ElapsedTimer startedAt={entry.started_at!} />
          ) : (
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {formatMinutes(entry.duration_minutes ?? 0)}
            </span>
          )}
          <Badge
            variant="muted"
            className={cn(
              "text-[10px] px-1.5 py-0",
              isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : ""
            )}
          >
            {isActive ? "Running" : entry.source === "timer" ? "Timer" : "Manual"}
          </Badge>
        </div>

        {entry.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.description}</p>
        )}

        {entry.logged_date && !isActive && (
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            {format(new Date(entry.logged_date), "MMM d, yyyy")}
          </p>
        )}
      </div>

      {!isActive && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all mt-0.5"
          onClick={() => onDelete(entry.id)}
          disabled={isDeleting}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface IssueTimeLogProps {
  issueId: string
  className?: string
}

export function IssueTimeLog({ issueId, className }: IssueTimeLogProps) {
  const [showForm, setShowForm] = useState(false)

  const { data: timeLogsData, isLoading } = useTimeLogs(issueId)
  const { data: activeTimer } = useActiveTimer(issueId)
  const logTime = useLogTime(issueId)
  const startTimer = useStartTimer(issueId)
  const stopTimer = useStopTimer(issueId)
  const deleteTimeLog = useDeleteTimeLog(issueId)

  const timeLogs = timeLogsData?.time_logs ?? []
  const totalMinutes = timeLogsData?.total_minutes ?? 0
  const timerRunning = activeTimer != null

  const handleLogTime = (input: Parameters<typeof logTime.mutate>[0]) => {
    logTime.mutate(input, {
      onSuccess: () => {
        setShowForm(false)
        toast.success("Time logged")
      },
      onError: () => toast.error("Failed to log time"),
    })
  }

  const handleStartTimer = () => {
    startTimer.mutate(undefined, {
      onSuccess: () => toast.success("Timer started"),
      onError: (err: any) => toast.error(err.message ?? "Failed to start timer"),
    })
  }

  const handleStopTimer = () => {
    stopTimer.mutate(undefined, {
      onSuccess: (data) => {
        const mins = data.time_log.duration_minutes ?? 0
        toast.success(`Timer stopped — ${formatMinutes(mins)} logged`)
      },
      onError: () => toast.error("Failed to stop timer"),
    })
  }

  const handleDelete = (id: string) => {
    deleteTimeLog.mutate(id, {
      onSuccess: () => toast.success("Time entry removed"),
      onError: () => toast.error("Failed to remove entry"),
    })
  }

  return (
    <div className={cn("px-6 py-4 space-y-4", className)}>
      {/* Header: total + controls */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
            Total logged
          </p>
          <p className="text-xl font-bold text-foreground tabular-nums">
            {totalMinutes > 0 ? formatMinutes(totalMinutes) : "—"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!showForm && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Log time
            </Button>
          )}

          {timerRunning ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs gap-1.5"
              onClick={handleStopTimer}
              disabled={stopTimer.isPending}
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleStartTimer}
              disabled={startTimer.isPending}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Manual log form */}
      {showForm && (
        <LogTimeForm
          onSubmit={handleLogTime}
          isPending={logTime.isPending}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Time log list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2.5 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : timeLogs.length > 0 ? (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {timeLogs.length} {timeLogs.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          <div>
            {timeLogs.map((entry) => (
              <TimeLogRow
                key={entry.id}
                entry={entry}
                onDelete={handleDelete}
                isDeleting={deleteTimeLog.isPending}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/50 text-center py-1">
          No time logged yet.
        </p>
      )}
    </div>
  )
}
