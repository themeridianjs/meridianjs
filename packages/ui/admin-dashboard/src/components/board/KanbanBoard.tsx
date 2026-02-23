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
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import type { Issue } from "@/api/hooks/useIssues"
import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"
import { KanbanColumn } from "./KanbanColumn"
import { IssueCard } from "./IssueCard"
import { AddStatusColumn } from "./AddStatusColumn"
import { toast } from "sonner"

interface KanbanBoardProps {
  issues: Issue[]
  projectId: string
  statuses: ProjectStatus[]
  onIssueClick?: (issue: Issue) => void
  onColumnsReorder?: (orderedIds: string[]) => void
}

type ColumnMap = Record<string, Issue[]>

function groupByStatus(issues: Issue[], statuses: ProjectStatus[]): ColumnMap {
  const map: ColumnMap = {}
  for (const s of statuses) {
    map[s.key] = []
  }
  for (const issue of issues) {
    if (map[issue.status] !== undefined) {
      map[issue.status].push(issue)
    } else {
      // Orphaned issues go to first column (or "backlog" fallback)
      const firstKey = statuses[0]?.key ?? "backlog"
      map[firstKey] = [...(map[firstKey] ?? []), issue]
    }
  }
  return map
}

export function KanbanBoard({ issues, projectId, statuses, onIssueClick, onColumnsReorder }: KanbanBoardProps) {
  const [columnOrder, setColumnOrder] = useState<string[]>(() => statuses.map((s) => s.id))
  const [columns, setColumns] = useState<ColumnMap>(() => groupByStatus(issues, statuses))
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null)

  // Keep column order in sync when statuses change from server
  const orderedStatuses = [...statuses].sort((a, b) => {
    const ai = columnOrder.indexOf(a.id)
    const bi = columnOrder.indexOf(b.id)
    if (ai === -1 && bi === -1) return a.position - b.position
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
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

  // Determine if id belongs to a column (by status key)
  const isColumnId = useCallback(
    (id: string) => statuses.some((s) => s.id === id),
    [statuses]
  )

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string

    // Column drag
    if (isColumnId(id)) {
      setDraggingColumnId(id)
      return
    }

    // Issue drag
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
    if (!over || draggingColumnId) return

    const activeId = active.id as string
    const overId = over.id as string

    // Ignore column drags
    if (isColumnId(activeId)) return

    const activeCol = findColumn(activeId)
    // Check if over is a column key directly or an issue in another column
    const overStatus = statuses.find((s) => s.key === overId || s.id === overId)
    const overColKey = overStatus?.key ?? findColumn(overId)

    if (!activeCol || !overColKey || activeCol === overColKey) return

    setColumns((prev) => {
      const activeItems = [...(prev[activeCol] ?? [])]
      const overItems = [...(prev[overColKey] ?? [])]
      const activeIndex = activeItems.findIndex((i) => i.id === activeId)
      const overIndex = overItems.findIndex((i) => i.id === overId)

      const moved = activeItems.splice(activeIndex, 1)[0]
      const updated = { ...moved, status: overColKey }

      const insertAt = overIndex >= 0 ? overIndex : overItems.length
      overItems.splice(insertAt, 0, updated)

      return { ...prev, [activeCol]: activeItems, [overColKey]: overItems }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveIssue(null)

    // Column reorder
    if (draggingColumnId) {
      setDraggingColumnId(null)
      if (!over || active.id === over.id) return

      const oldIndex = columnOrder.indexOf(active.id as string)
      const newIndex = columnOrder.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const newOrder = arrayMove(columnOrder, oldIndex, newIndex)
      setColumnOrder(newOrder)
      onColumnsReorder?.(newOrder)
      return
    }

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeCol = findColumn(activeId)
    const overStatus = statuses.find((s) => s.key === overId || s.id === overId)
    const overColKey = overStatus?.key ?? findColumn(overId)

    if (!activeCol || !overColKey) return

    if (activeCol === overColKey) {
      // Reorder within column
      setColumns((prev) => {
        const items = prev[activeCol] ?? []
        const oldIndex = items.findIndex((i) => i.id === activeId)
        const newIndex = items.findIndex((i) => i.id === overId)
        if (oldIndex === newIndex || oldIndex === -1) return prev
        return { ...prev, [activeCol]: arrayMove(items, oldIndex, newIndex) }
      })
    } else {
      // Status changed — persist to server
      const issue = columns[overColKey]?.find((i) => i.id === activeId)
      if (issue) {
        fetch(`/admin/issues/${activeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("meridian_token") ?? ""}`,
          },
          body: JSON.stringify({ status: overColKey }),
        }).catch(() => {
          toast.error("Failed to update issue status")
        })
      }
    }
  }

  // Keep columns in sync with server issues, preserving local ordering
  const syncedColumns = groupByStatus(issues, statuses)
  const displayColumns: ColumnMap = {}
  for (const s of statuses) {
    const serverIds = new Set((syncedColumns[s.key] ?? []).map((i) => i.id))
    const localOrdered = (columns[s.key] ?? []).filter((i) => serverIds.has(i.id))
    const newIssues = (syncedColumns[s.key] ?? []).filter(
      (i) => !localOrdered.some((l) => l.id === i.id)
    )
    displayColumns[s.key] = [...localOrdered, ...newIssues]
  }

  const draggingStatus = draggingColumnId
    ? statuses.find((s) => s.id === draggingColumnId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto px-6 py-4 pb-6">
        <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
          {orderedStatuses.map((status) => (
            <KanbanColumn
              key={status.id}
              id={status.id}
              label={status.name}
              color={status.color}
              category={status.category}
              issues={displayColumns[status.key] ?? []}
              sortable
              onIssueClick={onIssueClick}
            />
          ))}
        </SortableContext>

        <AddStatusColumn projectId={projectId} />
      </div>

      <DragOverlay>
        {activeIssue && <IssueCard issue={activeIssue} />}
        {draggingStatus && (
          <div className="opacity-80 min-w-[260px] max-w-[280px]">
            <div className="h-9 flex items-center gap-2 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: draggingStatus.color }} />
              {draggingStatus.name}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
