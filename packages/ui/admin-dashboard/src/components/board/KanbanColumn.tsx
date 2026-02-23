import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import type { Issue } from "@/api/hooks/useIssues"
import { IssueCard } from "./IssueCard"
import { cn } from "@/lib/utils"
import { Circle, CheckCircle2, Clock, Eye } from "lucide-react"

const STATUS_ICON_CLS: Record<string, string> = {
  backlog: "text-zinc-400",
  todo: "text-zinc-500",
  in_progress: "text-indigo-500",
  in_review: "text-amber-500",
  done: "text-emerald-500",
  cancelled: "text-zinc-300",
}

const StatusIcon = ({ status }: { status: string }) => {
  const cls = cn("h-3.5 w-3.5 shrink-0", STATUS_ICON_CLS[status])
  switch (status) {
    case "done": return <CheckCircle2 className={cls} />
    case "in_progress": return <Clock className={cls} />
    case "in_review": return <Eye className={cls} />
    default: return <Circle className={cls} />
  }
}

interface KanbanColumnProps {
  id: string
  label: string
  issues: Issue[]
  onIssueClick?: (issue: Issue) => void
}

export function KanbanColumn({ id, label, issues, onIssueClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex flex-col min-w-[260px] max-w-[280px] w-full">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <StatusIcon status={id} />
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="ml-1 text-[11px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 tabular-nums min-w-[18px] text-center">
          {issues.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 flex flex-col gap-2 min-h-[200px] p-2 rounded-lg transition-colors",
          "bg-[#f3f4f6] dark:bg-muted/40",
          isOver && "bg-[#eff6ff] dark:bg-[hsl(var(--indigo-subtle))] ring-1 ring-inset ring-indigo/30"
        )}
      >
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onClick={() => onIssueClick?.(issue)}
            />
          ))}
        </SortableContext>

        {issues.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-[120px]">
            <p className="text-xs text-muted-foreground/40">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}
