import { useNavigate } from "react-router-dom"
import type { Issue } from "@/api/hooks/useIssues"
import type { Sprint } from "@/api/hooks/useSprints"
import { format } from "date-fns"
import { PriorityIcon } from "./IssueRow"

interface MobileIssuesListProps {
  isLoading: boolean
  topLevel: Issue[]
  statusLabels: Record<string, string>
  statusColorMap: Record<string, string>
  sprints: Sprint[]
  workspace: string
  projectKey: string
}

/** Mobile flat card list (no horizontal scroll, hidden on desktop). */
export function MobileIssuesList({
  isLoading,
  topLevel,
  statusLabels,
  statusColorMap,
  sprints,
  workspace,
  projectKey,
}: MobileIssuesListProps) {
  const navigate = useNavigate()

  return (
    <div className="md:hidden divide-y divide-border/60">
      {isLoading ? (
        [1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-10 bg-muted rounded animate-pulse" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))
      ) : topLevel.length === 0 ? null : (
        topLevel.map((issue) => {
          const statusColor = statusColorMap?.[issue.status] ?? "#94a3b8"
          const activeSprint = sprints.find((s) => s.id === issue.sprint_id)
          return (
            <div
              key={issue.id}
              onClick={() => navigate(`/${workspace}/projects/${projectKey}/issues/${issue.id}`)}
              className="flex items-start gap-3 px-4 py-3 hover:bg-[#f9fafb] dark:hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{issue.identifier}</span>
                  <span className="text-sm text-foreground truncate font-medium">{issue.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityIcon priority={issue.priority} />
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
                    {statusLabels[issue.status] ?? issue.status}
                  </span>
                  {activeSprint && (
                    <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">{activeSprint.name}</span>
                  )}
                  {issue.due_date && (
                    <span className="text-[11px] text-muted-foreground">{format(new Date(issue.due_date), "MMM d")}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
