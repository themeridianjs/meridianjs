import { useIssues } from "@/api/hooks/useIssues"
import { useSprints } from "@/api/hooks/useSprints"
import { useProjectStatuses } from "@/api/hooks/useProjectStatuses"
import type { ZonePropMap } from "@/lib/widget-registry"

type Props = ZonePropMap["project.board.before"]

export function SprintHealthWidget({ projectId }: Props) {
  const { data: issues = [] } = useIssues(projectId)
  const { data: sprints = [] } = useSprints(projectId)
  const { data: statuses = [] } = useProjectStatuses(projectId)

  const activeSprint = sprints.find((s) => s.status === "active")
  if (!activeSprint) return null

  const sprintIssues = issues.filter((i) => i.sprint_id === activeSprint.id)
  if (sprintIssues.length === 0) return null

  const completedKeys = new Set(
    statuses.filter((s) => s.category === "completed").map((s) => s.key)
  )
  const done = sprintIssues.filter((i) => completedKeys.has(i.status)).length
  const total = sprintIssues.length
  const pct = Math.round((done / total) * 100)

  return (
    <div className="mx-6 mt-3 mb-1 flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{activeSprint.name}</span>
      <span>·</span>
      <span>{done} / {total} issues done</span>
      <div className="flex-1 max-w-32 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums">{pct}%</span>
    </div>
  )
}
