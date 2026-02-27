import { useState } from "react"
import { useParams } from "react-router-dom"
import { format } from "date-fns"
import {
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Trash2,
  CalendarRange,
  Target,
} from "lucide-react"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useSprints, useUpdateSprint, useDeleteSprint, type Sprint } from "@/api/hooks/useSprints"
import { useIssues } from "@/api/hooks/useIssues"
import { CreateSprintDialog } from "@/components/sprints/CreateSprintDialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { WidgetZone } from "@/components/WidgetZone"

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active: {
    label: "Active",
    icon: Play,
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    section: "Active Sprint",
  },
  planned: {
    label: "Planned",
    icon: Clock,
    badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    section: "Planned",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    section: "Completed",
  },
}

// ─── SprintRow ────────────────────────────────────────────────────────────────

interface SprintRowProps {
  sprint: Sprint
  projectId: string
  issueCount: number
}

function SprintRow({ sprint, projectId, issueCount }: SprintRowProps) {
  const update = useUpdateSprint(sprint.id, projectId)
  const deleteSprint = useDeleteSprint(projectId)
  const cfg = STATUS_CONFIG[sprint.status]
  const Icon = cfg.icon

  function startSprint() {
    update.mutate(
      { status: "active" },
      {
        onSuccess: () => toast.success(`"${sprint.name}" started`),
        onError: () => toast.error("Failed to start sprint"),
      }
    )
  }

  function completeSprint() {
    update.mutate(
      { status: "completed" },
      {
        onSuccess: () => toast.success(`"${sprint.name}" completed`),
        onError: (e: any) => toast.error(e?.message ?? "Failed to complete sprint"),
      }
    )
  }

  function handleDelete() {
    if (!confirm(`Delete sprint "${sprint.name}"? This cannot be undone.`)) return
    deleteSprint.mutate(sprint.id, {
      onSuccess: () => toast.success("Sprint deleted"),
      onError: () => toast.error("Failed to delete sprint"),
    })
  }

  const hasStart = !!sprint.start_date
  const hasEnd = !!sprint.end_date

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group">
      {/* Left: status icon + name + goal */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full shrink-0",
          sprint.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/30" :
          sprint.status === "completed" ? "bg-blue-100 dark:bg-blue-900/30" :
          "bg-zinc-100 dark:bg-zinc-800"
        )}>
          <Icon className={cn("h-3.5 w-3.5",
            sprint.status === "active" ? "text-emerald-600 dark:text-emerald-400" :
            sprint.status === "completed" ? "text-blue-600 dark:text-blue-400" :
            "text-zinc-500"
          )} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{sprint.name}</p>
          {sprint.goal && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
              <Target className="h-3 w-3 shrink-0" />
              {sprint.goal}
            </p>
          )}
        </div>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 w-52">
        <CalendarRange className="h-3.5 w-3.5 shrink-0" />
        {hasStart || hasEnd ? (
          <span>
            {hasStart ? format(new Date(sprint.start_date!), "MMM d") : "—"}
            {" → "}
            {hasEnd ? format(new Date(sprint.end_date!), "MMM d, yyyy") : "—"}
          </span>
        ) : (
          <span className="italic">No dates set</span>
        )}
      </div>

      {/* Issue count */}
      <div className="text-xs text-muted-foreground shrink-0 w-20 text-right">
        {issueCount} issue{issueCount !== 1 ? "s" : ""}
      </div>

      {/* Status badge */}
      <Badge className={cn("shrink-0 text-[11px] border-0 w-20 justify-center", cfg.badge)}>
        {cfg.label}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {sprint.status === "planned" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={startSprint}
            disabled={update.isPending}
          >
            <Play className="h-3 w-3" />
            Start
          </Button>
        )}
        {sprint.status === "active" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={completeSprint}
            disabled={update.isPending}
          >
            <CheckCircle2 className="h-3 w-3" />
            Complete
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteSprint.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── SprintsPage ──────────────────────────────────────────────────────────────

export function SprintsPage() {
  const { projectKey } = useParams<{ projectKey: string }>()
  const [createOpen, setCreateOpen] = useState(false)

  const { data: project } = useProjectByKey(projectKey ?? "")
  const projectId = project?.id ?? ""

  const { data: sprints, isLoading } = useSprints(projectId || undefined)
  const { data: issues } = useIssues(projectId || undefined)

  // Count issues per sprint (client-side, issues may already be cached)
  const issueCounts = (issues ?? []).reduce<Record<string, number>>((acc, issue) => {
    if (issue.sprint_id) acc[issue.sprint_id] = (acc[issue.sprint_id] ?? 0) + 1
    return acc
  }, {})

  const grouped = {
    active:    (sprints ?? []).filter((s) => s.status === "active"),
    planned:   (sprints ?? []).filter((s) => s.status === "planned"),
    completed: (sprints ?? []).filter((s) => s.status === "completed"),
  }

  const sections = [
    { key: "active",    label: "Active Sprint",  items: grouped.active },
    { key: "planned",   label: "Planned",        items: grouped.planned },
    { key: "completed", label: "Completed",      items: grouped.completed },
  ] as const

  return (
    <div className="p-2">
      <WidgetZone zone="project.sprints.before" props={{ projectId }} />
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-end px-6 py-3 border-b border-border">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Sprint
          </Button>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-4 w-40" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : (sprints ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <CalendarRange className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No sprints yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create a sprint to start planning your work in time-boxed iterations.
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New Sprint
            </Button>
          </div>
        ) : (
          <div>
            {sections.map(({ key, label, items }) =>
              items.length === 0 ? null : (
                <div key={key}>
                  <div className="px-6 py-2 border-b border-border bg-muted/20">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {label}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((sprint) => (
                      <SprintRow
                        key={sprint.id}
                        sprint={sprint}
                        projectId={projectId}
                        issueCount={issueCounts[sprint.id] ?? 0}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <WidgetZone zone="project.sprints.after" props={{ projectId }} />

      <CreateSprintDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
      />
    </div>
  )
}
