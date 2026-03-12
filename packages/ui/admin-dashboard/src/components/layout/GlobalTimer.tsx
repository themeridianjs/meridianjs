import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useGlobalActiveTimer, useGlobalStopTimer } from "@/api/hooks/useTimeLogs"
import { useAuth } from "@/stores/auth"
import { formatElapsed, formatMinutes } from "@/lib/time-utils"
import { Square, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function LiveElapsed({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(startedAt))

  useEffect(() => {
    const id = setInterval(() => setElapsed(formatElapsed(startedAt)), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return <span className="font-mono tabular-nums text-xs font-semibold">{elapsed}</span>
}

export function GlobalTimer() {
  const { data: timer } = useGlobalActiveTimer()
  const stopTimer = useGlobalStopTimer()
  const { workspace } = useAuth()
  const ws = workspace?.slug ?? ""

  if (!timer || !timer.started_at) return null

  const identifier = timer.issue_identifier ?? "Issue"
  // Build link: /:ws/projects/:projectKey/issues/:issueId
  const issueLink = timer.project_identifier
    ? `/${ws}/projects/${timer.project_identifier}/issues/${timer.issue_id}`
    : `/${ws}/projects`

  const handleStop = () => {
    stopTimer.mutate(undefined, {
      onSuccess: (data) => {
        const mins = data.time_log?.duration_minutes ?? 0
        toast.success(`Timer stopped — ${formatMinutes(mins)} logged`)
      },
      onError: () => toast.error("Failed to stop timer"),
    })
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-emerald-700 dark:text-emerald-400">
      <Timer className="h-3 w-3 shrink-0" />
      <Link
        to={issueLink}
        className="text-xs font-medium hover:underline truncate max-w-[100px]"
        title={timer.issue_title ?? identifier}
      >
        {identifier}
      </Link>
      <LiveElapsed startedAt={timer.started_at} />
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 rounded-full text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900 hover:text-emerald-900 dark:hover:text-emerald-200"
        onClick={handleStop}
        disabled={stopTimer.isPending}
      >
        <Square className="h-2.5 w-2.5 fill-current" />
      </Button>
    </div>
  )
}
