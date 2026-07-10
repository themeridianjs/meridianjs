import { memo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Issue } from "@/api/hooks/useIssues"
import { useUserMap } from "@/api/hooks/useUsers"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type UserDisplayMap = Map<string, { name: string; initials: string }>
import { ISSUE_PRIORITY_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Circle, Zap, ArrowUp, ArrowDown, Minus, ListTree, Calendar } from "lucide-react"
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

interface IssueCardProps {
  issue: Issue
  childCount?: number
  onClick?: () => void
  /** Optional shared user map — pass from the board to avoid one query subscription per card. */
  userMap?: UserDisplayMap
}

function IssueCardImpl({ issue, childCount = 0, onClick, userMap: userMapProp }: IssueCardProps) {
  // Fall back to the hook when no shared map is passed (keeps standalone usage working).
  const { data: userMapFromHook } = useUserMap({ enabled: userMapProp === undefined })
  const userMap = userMapProp ?? userMapFromHook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-card border border-border rounded-lg px-3 py-2.5 cursor-pointer select-none",
        "hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors",
        isDragging && "opacity-40 shadow-lg ring-2 ring-indigo/30"
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
          {issue.parent_id && (
            <span className="flex items-center text-zinc-400 dark:text-zinc-500 shrink-0" title="Child issue">
              <ListTree className="h-3 w-3" />
            </span>
          )}
          {childCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded shrink-0">
              <ListTree className="h-2.5 w-2.5" />
              {childCount}
            </span>
          )}
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

// Memoized: on a large board, drag/hover updates board-level state constantly;
// without memo every card re-renders on each onDragOver tick.
export const IssueCard = memo(IssueCardImpl)
