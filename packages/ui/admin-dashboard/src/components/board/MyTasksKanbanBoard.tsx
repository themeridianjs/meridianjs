import { useMemo } from "react"
import type { MyTaskIssue } from "@/api/hooks/useMyTasks"
import { MyTaskIssueCard } from "./MyTaskIssueCard"
import { Circle, CheckCircle2, Clock } from "lucide-react"

interface MyTasksKanbanBoardProps {
  issues: MyTaskIssue[]
  onIssueClick?: (issue: MyTaskIssue) => void
}

type Category = "backlog" | "unstarted" | "started" | "completed" | "cancelled"

const CATEGORY_COLUMNS: { key: Category; label: string; color: string }[] = [
  { key: "backlog", label: "Backlog", color: "#94a3b8" },
  { key: "unstarted", label: "Unstarted", color: "#64748b" },
  { key: "started", label: "Started", color: "#6366f1" },
  { key: "completed", label: "Completed", color: "#10b981" },
  { key: "cancelled", label: "Cancelled", color: "#9ca3af" },
]

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

export function MyTasksKanbanBoard({ issues, onIssueClick }: MyTasksKanbanBoardProps) {
  const grouped = useMemo(() => {
    const map: Record<string, MyTaskIssue[]> = {}
    for (const col of CATEGORY_COLUMNS) map[col.key] = []
    for (const issue of issues) {
      const cat = issue._status.category as string
      if (map[cat]) {
        map[cat].push(issue)
      } else {
        map["backlog"].push(issue)
      }
    }
    return map
  }, [issues])

  return (
    <div className="flex gap-4 min-h-full overflow-x-auto px-6 py-4 pb-6">
      {CATEGORY_COLUMNS.map((col) => {
        const colIssues = grouped[col.key]
        const bgColor = hexToRgba(col.color, 0.08)

        return (
          <div key={col.key} className="flex flex-col min-w-[260px] max-w-[280px] w-full">
            {/* Column header — matches KanbanColumn */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <CategoryIcon category={col.key} color={col.color} />
              <span className="text-xs font-medium text-foreground">{col.label}</span>
              <span
                className="ml-1 text-[11px] font-medium rounded-full px-1.5 py-0.5 tabular-nums min-w-[18px] text-center"
                style={{ backgroundColor: hexToRgba(col.color, 0.12), color: col.color }}
              >
                {colIssues.length}
              </span>
            </div>

            {/* Drop zone — matches KanbanColumn tinted background */}
            <div
              className="flex-1 flex flex-col gap-2 min-h-[200px] p-2 rounded-xl transition-colors"
              style={{ backgroundColor: bgColor }}
            >
              {colIssues.map((issue) => (
                <MyTaskIssueCard
                  key={issue.id}
                  issue={issue}
                  onClick={() => onIssueClick?.(issue)}
                />
              ))}

              {colIssues.length === 0 && (
                <div className="flex-1 flex items-center justify-center min-h-[120px]">
                  <p className="text-xs text-muted-foreground/40">No tasks</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
