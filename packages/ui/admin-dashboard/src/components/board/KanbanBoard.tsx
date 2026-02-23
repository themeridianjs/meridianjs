import { useState, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import type { Issue } from "@/api/hooks/useIssues"
import { useUpdateIssue } from "@/api/hooks/useIssues"
import { KanbanColumn } from "./KanbanColumn"
import { IssueCard } from "./IssueCard"
import { BOARD_COLUMNS } from "@/lib/constants"
import { toast } from "sonner"

interface KanbanBoardProps {
  issues: Issue[]
  projectId: string
  onIssueClick?: (issue: Issue) => void
}

type ColumnMap = Record<string, Issue[]>

function groupByStatus(issues: Issue[]): ColumnMap {
  const map: ColumnMap = {}
  for (const col of BOARD_COLUMNS) {
    map[col.key] = []
  }
  for (const issue of issues) {
    if (map[issue.status]) {
      map[issue.status].push(issue)
    } else {
      map["backlog"] = [...(map["backlog"] ?? []), issue]
    }
  }
  return map
}

export function KanbanBoard({ issues, projectId, onIssueClick }: KanbanBoardProps) {
  const [columns, setColumns] = useState<ColumnMap>(() => groupByStatus(issues))
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)
  const updateIssue = useUpdateIssue("", projectId)

  // Re-sync when issues change from server
  useState(() => {
    setColumns(groupByStatus(issues))
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const findColumn = useCallback(
    (issueId: string): string | null => {
      for (const [colId, colIssues] of Object.entries(columns)) {
        if (colIssues.some((i) => i.id === issueId)) return colId
      }
      return null
    },
    [columns]
  )

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string
    for (const colIssues of Object.values(columns)) {
      const found = colIssues.find((i) => i.id === id)
      if (found) {
        setActiveIssue(found)
        return
      }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeCol = findColumn(activeId)
    // Check if over is a column directly or an issue in another column
    const overCol = columns[overId] !== undefined ? overId : findColumn(overId)

    if (!activeCol || !overCol || activeCol === overCol) return

    setColumns((prev) => {
      const activeItems = [...prev[activeCol]]
      const overItems = [...prev[overCol]]
      const activeIndex = activeItems.findIndex((i) => i.id === activeId)
      const overIndex = overItems.findIndex((i) => i.id === overId)

      const moved = activeItems.splice(activeIndex, 1)[0]
      // Update status optimistically
      const updated = { ...moved, status: overCol }

      const insertAt = overIndex >= 0 ? overIndex : overItems.length
      overItems.splice(insertAt, 0, updated)

      return { ...prev, [activeCol]: activeItems, [overCol]: overItems }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveIssue(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeCol = findColumn(activeId)
    const overCol = columns[overId] !== undefined ? overId : findColumn(overId)

    if (!activeCol || !overCol) return

    if (activeCol === overCol) {
      // Reorder within column
      setColumns((prev) => {
        const items = prev[activeCol]
        const oldIndex = items.findIndex((i) => i.id === activeId)
        const newIndex = items.findIndex((i) => i.id === overId)
        if (oldIndex === newIndex) return prev
        return { ...prev, [activeCol]: arrayMove(items, oldIndex, newIndex) }
      })
    } else {
      // Status changed — persist to server
      const issue = columns[overCol]?.find((i) => i.id === activeId)
      if (issue && issue.status !== activeCol) {
        void updateIssue
        fetch(`/admin/issues/${activeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("meridian_token") ?? ""}`,
          },
          body: JSON.stringify({ status: overCol }),
        }).catch(() => {
          toast.error("Failed to update issue status")
        })
      }
    }
  }

  // Keep columns in sync with prop changes
  const syncedColumns = groupByStatus(issues)
  // Merge local ordering with server data
  const displayColumns: ColumnMap = {}
  for (const col of BOARD_COLUMNS) {
    const serverIds = new Set(syncedColumns[col.key]?.map((i) => i.id) ?? [])
    const localOrdered = (columns[col.key] ?? []).filter((i) => serverIds.has(i.id))
    const newIssues = (syncedColumns[col.key] ?? []).filter(
      (i) => !localOrdered.some((l) => l.id === i.id)
    )
    displayColumns[col.key] = [...localOrdered, ...newIssues]
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto px-6 py-4 pb-6">
        {BOARD_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            id={col.key}
            label={col.label}
            issues={displayColumns[col.key] ?? []}
            onIssueClick={onIssueClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeIssue && <IssueCard issue={activeIssue} />}
      </DragOverlay>
    </DndContext>
  )
}
