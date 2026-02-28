import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
  closestCorners,
  rectIntersection,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { useQueryClient } from "@tanstack/react-query"
import type { Issue } from "@/api/hooks/useIssues"
import { issueKeys } from "@/api/hooks/useIssues"
import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"
import { KanbanColumn } from "./KanbanColumn"
import { IssueCard } from "./IssueCard"
import { AddStatusColumn } from "./AddStatusColumn"
import { api } from "@/api/client"
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
      // Orphaned issues (unknown status) fall back to the first column
      const firstKey = statuses[0]?.key ?? "backlog"
      map[firstKey] = [...(map[firstKey] ?? []), issue]
    }
  }
  return map
}

/**
 * Merge fresh server issues into the existing column map, preserving the
 * within-column order the user established via drag-and-drop.
 *
 * - Issues already placed in a column keep their current position (just data
 *   fields like title/assignee get refreshed from the server response).
 * - Issues whose status changed externally (e.g., another user moved them)
 *   are removed from their old column and appended to the correct new one.
 * - Brand-new issues (not present in prev) are appended to their column.
 */
function mergeColumnsWithServer(
  prev: ColumnMap,
  issues: Issue[],
  statuses: ProjectStatus[]
): ColumnMap {
  const serverById = new Map(issues.map((i) => [i.id, i]))
  const newMap: ColumnMap = {}
  for (const s of statuses) {
    newMap[s.key] = []
  }

  // Pass 1: keep existing issues in their current positions (order preserved)
  for (const s of statuses) {
    for (const issue of prev[s.key] ?? []) {
      const latest = serverById.get(issue.id)
      if (latest && latest.status === s.key) {
        newMap[s.key].push(latest)
        serverById.delete(issue.id) // mark as placed
      }
      // if latest is missing or has a different status, skip — handled below
    }
  }

  // Pass 2: place remaining issues (new issues, or those whose status changed)
  for (const issue of serverById.values()) {
    const col = newMap[issue.status]
    if (col) {
      col.push(issue)
    } else {
      const firstKey = statuses[0]?.key
      if (firstKey) newMap[firstKey].push(issue)
    }
  }

  return newMap
}

export function KanbanBoard({ issues, projectId, statuses, onIssueClick, onColumnsReorder }: KanbanBoardProps) {
  const [columnOrder, setColumnOrder] = useState<string[]>(() => statuses.map((s) => s.id))
  const [columns, setColumns] = useState<ColumnMap>(() => groupByStatus(issues, statuses))
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null)

  /**
   * Track the column a card was in when the drag started, before handleDragOver
   * moves it. By drag-end time, findColumn(activeId) already points to the
   * target column, so we need the original to detect cross-column moves.
   */
  const dragSourceColRef = useRef<string | null>(null)
  /** Prevents the server-sync useEffect from overwriting columns mid-drag. */
  const isDraggingRef = useRef(false)
  const qc = useQueryClient()

  const childCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const issue of issues) {
      if (issue.parent_id) map.set(issue.parent_id, (map.get(issue.parent_id) ?? 0) + 1)
    }
    return map
  }, [issues])

  // When the server issues list changes (refetch, new issue, etc.) and no drag
  // is in progress, sync the local column map from the canonical server data.
  // We use mergeColumnsWithServer instead of a full rebuild so that
  // within-column order set by the user is preserved even after the optimistic
  // qc.setQueryData triggers this effect right after a drop.
  useEffect(() => {
    if (isDraggingRef.current) return
    setColumns((prev) => mergeColumnsWithServer(prev, issues, statuses))
  }, [issues, statuses])

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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // When dragging a column, only consider other columns as drop targets.
  // closestCorners would otherwise resolve to the nearest *issue card* inside
  // a column, making over.id an issue ID and causing the reorder to silently
  // bail out (columnOrder.indexOf(issueId) === -1).
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (draggingColumnId) {
        const columnContainers = args.droppableContainers.filter((c) =>
          columnOrder.includes(c.id as string)
        )
        return rectIntersection({ ...args, droppableContainers: columnContainers })
      }
      return closestCorners(args)
    },
    [draggingColumnId, columnOrder]
  )

  const findColumn = useCallback(
    (issueId: string): string | null => {
      for (const [colKey, colIssues] of Object.entries(columns)) {
        if (colIssues.some((i) => i.id === issueId)) return colKey
      }
      return null
    },
    [columns]
  )

  const isColumnId = useCallback(
    (id: string) => statuses.some((s) => s.id === id),
    [statuses]
  )

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string
    isDraggingRef.current = true

    if (isColumnId(id)) {
      setDraggingColumnId(id)
      return
    }

    for (const [colKey, colIssues] of Object.entries(columns)) {
      const found = colIssues.find((i) => i.id === id)
      if (found) {
        setActiveIssue(found)
        // Capture the source column before handleDragOver can change it
        dragSourceColRef.current = colKey
        return
      }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || draggingColumnId) return

    const activeId = active.id as string
    const overId = over.id as string

    if (isColumnId(activeId)) return

    const activeCol = findColumn(activeId)
    const overStatus = statuses.find((s) => s.key === overId || s.id === overId)
    const overColKey = overStatus?.key ?? findColumn(overId)

    if (!activeCol || !overColKey || activeCol === overColKey) return

    setColumns((prev) => {
      const activeItems = [...(prev[activeCol] ?? [])]
      const overItems = [...(prev[overColKey] ?? [])]
      const activeIndex = activeItems.findIndex((i) => i.id === activeId)
      if (activeIndex === -1) return prev // stale closure guard

      const [moved] = activeItems.splice(activeIndex, 1)
      const movedWithStatus = { ...moved, status: overColKey }

      if (overStatus) {
        // Hovering over the column drop zone → append to end
        overItems.push(movedWithStatus)
      } else {
        // Hovering over a specific card → insert above or below it
        const overCardIndex = overItems.findIndex((i) => i.id === overId)
        if (overCardIndex === -1) {
          overItems.push(movedWithStatus)
        } else {
          const isBelowOverCard =
            active.rect.current.translated != null &&
            active.rect.current.translated.top >
              over.rect.top + over.rect.height / 2
          overItems.splice(
            isBelowOverCard ? overCardIndex + 1 : overCardIndex,
            0,
            movedWithStatus
          )
        }
      }

      return { ...prev, [activeCol]: activeItems, [overColKey]: overItems }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveIssue(null)
    isDraggingRef.current = false

    // ── Column reorder ────────────────────────────────────────────────────────
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

    // ── Issue drag cancelled (Escape / dropped outside) ───────────────────────
    if (!over) {
      const originalCol = dragSourceColRef.current
      dragSourceColRef.current = null
      if (originalCol) {
        // handleDragOver may have moved the card visually — revert
        setColumns(groupByStatus(issues, statuses))
      }
      return
    }

    const activeId = active.id as string
    const overId = over.id as string
    const originalCol = dragSourceColRef.current
    dragSourceColRef.current = null

    const overStatus = statuses.find((s) => s.key === overId || s.id === overId)
    const overColKey = overStatus?.key ?? findColumn(overId)

    if (!originalCol || !overColKey) return

    if (originalCol === overColKey) {
      // ── Same-column reorder ──────────────────────────────────────────────
      // handleDragOver never fires for same-column, so columns still has the
      // original order — apply the reorder now.
      setColumns((prev) => {
        const items = prev[originalCol] ?? []
        const oldIndex = items.findIndex((i) => i.id === activeId)
        const newIndex = items.findIndex((i) => i.id === overId)
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev
        return { ...prev, [originalCol]: arrayMove(items, oldIndex, newIndex) }
      })
    } else {
      // ── Cross-column ─────────────────────────────────────────────────────
      // handleDragOver already placed the card at the right position within
      // overColKey; the blocks below correct any residual drift if the user
      // moved within the target column after the initial cross-column entry.
      // Determine final position based on what the user dropped onto.
      const droppedOnCard = !statuses.find((s) => s.key === overId || s.id === overId)

      if (droppedOnCard) {
        // Dropped onto a specific card.
        // handleDragOver already inserted the card at the right position;
        // this corrects for any drift when the user moves within the column
        // after the initial cross-column insertion.
        setColumns((prev) => {
          const items = [...(prev[overColKey] ?? [])]
          const fromIdx = items.findIndex((i) => i.id === activeId)
          if (fromIdx === -1) return prev

          const isBelowTarget =
            event.active.rect.current.translated != null &&
            event.active.rect.current.translated.top >
              event.over!.rect.top + event.over!.rect.height / 2

          // Remove active card first so target index is stable
          const [removed] = items.splice(fromIdx, 1)
          const overIdx = items.findIndex((i) => i.id === overId)
          if (overIdx === -1) {
            items.splice(fromIdx, 0, removed) // target disappeared — restore
            return prev
          }
          const insertAt = isBelowTarget ? overIdx + 1 : overIdx
          items.splice(insertAt, 0, removed)
          return { ...prev, [overColKey]: items }
        })
      } else {
        // Dropped onto the column droppable zone (padding area above/below cards).
        // Use the ghost rect vs. column midpoint to decide top vs. bottom.
        const ghostTop = event.active.rect.current.translated?.top ?? Infinity
        const colMidY = event.over!.rect.top + event.over!.rect.height / 2

        if (ghostTop < colMidY) {
          // Cursor is in the upper half → move card to the top of the column.
          setColumns((prev) => {
            const items = prev[overColKey] ?? []
            const fromIdx = items.findIndex((i) => i.id === activeId)
            if (fromIdx <= 0) return prev
            return { ...prev, [overColKey]: arrayMove(items, fromIdx, 0) }
          })
        }
        // Lower half → card is already at the end from handleDragOver, nothing to do.
      }

      const prevData = qc.getQueryData<{ issues: Issue[]; count: number }>(
        issueKeys.byProject(projectId)
      )

      qc.setQueryData(issueKeys.byProject(projectId), (old: any) => {
        if (!old) return old
        return {
          ...old,
          issues: old.issues.map((i: Issue) =>
            i.id === activeId ? { ...i, status: overColKey } : i
          ),
        }
      })

      api
        .put(`/admin/issues/${activeId}`, { status: overColKey })
        .then(() => {
          qc.invalidateQueries({ queryKey: issueKeys.byProject(projectId) })
        })
        .catch(() => {
          if (prevData) qc.setQueryData(issueKeys.byProject(projectId), prevData)
          setColumns(groupByStatus(prevData?.issues ?? issues, statuses))
          toast.error("Failed to update issue status")
        })
    }
  }

  const draggingStatus = draggingColumnId
    ? statuses.find((s) => s.id === draggingColumnId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
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
              issues={columns[status.key] ?? []}
              childCounts={childCounts}
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
