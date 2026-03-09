import type { MyTaskIssue } from "@/api/hooks/useMyTasks"
import { useUserMap } from "@/api/hooks/useUsers"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ISSUE_PRIORITY_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Circle, Zap, ArrowUp, ArrowDown, Minus, Calendar } from "lucide-react"
import { format } from "date-fns"

const PriorityIcon = ({ priority }: { priority: string }) => {
  const cls = cn("h-3 w-3 shrink-0", ISSUE_PRIORITY_COLORS[priority])
  switch (priority) {
    case "urgent": return <Zap className={cls} />
    case "high": return <ArrowUp className={cls} />
    case "medium": return <Minus className={cls} />
    case "low": return <ArrowDown className={cls} />
    default: return <Circle className="h-3 w-3 shrink-0 text-zinc-300" />
  }
}

interface MyTaskIssueCardProps {
  issue: MyTaskIssue
  onClick?: () => void
}

export function MyTaskIssueCard({ issue, onClick }: MyTaskIssueCardProps) {
  const { data: userMap } = useUserMap()

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-card border border-border rounded-lg px-3 py-2.5 cursor-pointer select-none",
        "hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
      )}
    >
      <p className="text-[13px] text-foreground leading-snug line-clamp-2 mb-2">
        {issue.title}
      </p>

      {/* Dates */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
        <Calendar className="h-2.5 w-2.5 shrink-0" />
        <span>{issue.start_date ? format(new Date(issue.start_date), "MMM d") : "?"}</span>
        <span>→</span>
        <span>{issue.due_date ? format(new Date(issue.due_date), "MMM d") : "?"}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded shrink-0">
            {issue.identifier}
          </span>
          {issue._project && (
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
              {issue._project.identifier}
            </span>
          )}
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: issue._status.color }}
          />
          <span className="text-[11px] text-muted-foreground truncate">
            {issue._status.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {(issue.assignee_ids ?? []).length > 0 && (
            <div className="flex -space-x-1">
              {(issue.assignee_ids ?? []).slice(0, 2).map((uid) => {
                const u = userMap?.get(uid)
                return (
                  <Avatar key={uid} className="h-4 w-4 border border-background">
                    <AvatarFallback className="text-[8px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {u?.initials ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                )
              })}
              {(issue.assignee_ids?.length ?? 0) > 2 && (
                <span className="text-[9px] text-muted-foreground ml-1.5 self-center">
                  +{(issue.assignee_ids?.length ?? 0) - 2}
                </span>
              )}
            </div>
          )}
          <PriorityIcon priority={issue.priority} />
        </div>
      </div>
    </div>
  )
}
