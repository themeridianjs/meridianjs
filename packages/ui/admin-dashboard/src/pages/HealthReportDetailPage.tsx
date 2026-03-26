import { useParams } from "react-router-dom"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { RichTextContent } from "@/components/ui/rich-text-editor"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useProjectHealthUpdate, type ProjectHealthUpdate } from "@/api/hooks/useProjectHealth"

type HealthStatus = ProjectHealthUpdate["health"]

const HEALTH_CONFIG: Record<HealthStatus, { label: string; dotCls: string; badgeCls: string; accentBg: string }> = {
  on_track: {
    label: "On track",
    dotCls: "bg-emerald-500",
    badgeCls: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800",
    accentBg: "bg-emerald-500",
  },
  delayed: {
    label: "Delayed",
    dotCls: "bg-orange-500",
    badgeCls: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/40 dark:border-orange-800",
    accentBg: "bg-orange-500",
  },
  on_hold: {
    label: "On hold",
    dotCls: "bg-amber-400",
    badgeCls: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800",
    accentBg: "bg-amber-400",
  },
  completed: {
    label: "Completed",
    dotCls: "bg-indigo-500",
    badgeCls: "text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-800",
    accentBg: "bg-indigo-500",
  },
}

function HealthBadge({ health, className }: { health: HealthStatus; className?: string }) {
  const cfg = HEALTH_CONFIG[health]
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0",
      cfg.badgeCls,
      className,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dotCls)} />
      {cfg.label}
    </span>
  )
}

export function HealthReportDetailPage() {
  const { projectKey, reportId } = useParams<{ projectKey: string; reportId: string }>()
  const { data: project } = useProjectByKey(projectKey ?? "")
  const { data: update, isLoading, isError } = useProjectHealthUpdate(project?.id, reportId)

  if (isLoading) {
    return (
      <div className="mx-auto px-8 py-10">
        <Skeleton className="h-1 w-16 rounded-full mb-6" />
        <Skeleton className="h-7 w-2/3 mb-4" />
        <Skeleton className="h-5 w-32 mb-6" />
        <Skeleton className="h-px w-full mb-6" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-2" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    )
  }

  if (isError || !update) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Health report not found.
      </div>
    )
  }

  const cfg = HEALTH_CONFIG[update.health]

  return (
    <div className="overflow-auto h-full bg-white dark:bg-card">
      <div className="mx-auto px-8 py-10">

        {/* Status accent bar */}
        <div className={cn("h-1 w-16 rounded-full mb-6", cfg.accentBg)} />

        {/* Title */}
        <h2 className="text-xl font-semibold tracking-tight leading-snug mb-2">
          {update.title}
        </h2>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-6">
          <HealthBadge health={update.health} />
          <span className="text-sm text-muted-foreground">
            {format(parseISO(update.created_at), "d MMM yyyy 'at' HH:mm")}
          </span>
        </div>

        <Separator className="mb-6" />

        {/* Summary content */}
        {update.summary ? (
          <RichTextContent html={update.summary} />
        ) : (
          <p className="text-sm text-muted-foreground italic">No summary was provided for this update.</p>
        )}
      </div>
    </div>
  )
}
