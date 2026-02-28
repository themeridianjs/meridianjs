import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Issue } from "@/api/hooks/useIssues"
import { IssueCard } from "./IssueCard"
import { cn } from "@/lib/utils"
import { Circle, CheckCircle2, Clock, GripVertical } from "lucide-react"

type Category = "backlog" | "unstarted" | "started" | "completed" | "cancelled"

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(148,163,184,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

const CategoryIcon = ({ category, color }: { category: Category; color: string }) => {
  const cls = "h-3.5 w-3.5 shrink-0"
  const style = { color }
  switch (category) {
    case "completed": return <CheckCircle2 className={cls} style={style} />
    case "started":   return <Clock className={cls} style={style} />
    default:          return <Circle className={cls} style={style} />
  }
}

interface KanbanColumnProps {
  id: string
  label: string
  color: string
  category: Category
  issues: Issue[]
  childCounts?: Map<string, number>
  /** When true, this column is part of a sortable column context */
  sortable?: boolean
  onIssueClick?: (issue: Issue) => void
}

export function KanbanColumn({ id, label, color, category, issues, childCounts, sortable, onIssueClick }: KanbanColumnProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id })

  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !sortable })

  const style = sortable
    ? { transform: CSS.Transform.toString(transform), transition }
    : undefined

  const bgColor = hexToRgba(color, 0.08)
  const bgOverColor = hexToRgba(color, 0.16)
  const ringColor = hexToRgba(color, 0.35)

  return (
    <div
      ref={setSortRef}
      style={style}
      className={cn("flex flex-col min-w-[260px] max-w-[280px] w-full", isDragging && "opacity-50")}
    >
      {/* Column header */}
      <div className={cn("flex items-center gap-2 mb-2 px-1", sortable && "cursor-grab")}>
        {sortable && (
          <span {...attributes} {...listeners} className="text-muted-foreground/40 hover:text-muted-foreground touch-none">
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        )}
        <CategoryIcon category={category} color={color} />
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="ml-1 text-[11px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 tabular-nums min-w-[18px] text-center">
          {issues.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setDropRef}
        className={cn(
          "flex-1 flex flex-col gap-2 min-h-[200px] p-2 rounded-xl transition-colors"
        )}
        style={{
          backgroundColor: isOver ? bgOverColor : bgColor,
          boxShadow: isOver ? `inset 0 0 0 1px ${ringColor}` : undefined,
        }}
      >
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              childCount={childCounts?.get(issue.id) ?? 0}
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
