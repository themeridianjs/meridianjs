import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Issue } from "@/api/hooks/useIssues"
import { useUserMap } from "@/api/hooks/useUsers"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ISSUE_PRIORITY_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Circle, Zap, ArrowUp, ArrowDown, Minus } from "lucide-react"

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
  onClick?: () => void
}

export function IssueCard({ issue, onClick }: IssueCardProps) {
  const { data: userMap } = useUserMap()
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
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-muted-foreground">
          {issue.identifier}
        </span>
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
