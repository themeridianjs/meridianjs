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
  closestCenter,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { useQueryClient } from "@tanstack/react-query"
import type { Issue, BoardFilters } from "@/api/hooks/useIssues"
import { issueKeys } from "@/api/hooks/useIssues"
import type { IssuesResponse } from "@/api/hooks/useIssues"
import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"
import { useDeleteProjectStatus, useUpdateProjectStatus } from "@/api/hooks/useProjectStatuses"
import { KanbanColumn } from "./KanbanColumn"
import { IssueCard } from "./IssueCard"
import { AddStatusColumn } from "./AddStatusColumn"
import { DeleteStatusDialog } from "./DeleteStatusDialog"
import { api } from "@/api/client"
import { toast } from "sonner"
import confetti from "canvas-confetti"

interface KanbanBoardProps {
  issues: Issue[]
  projectId: string
  statuses: ProjectStatus[]
  onIssueClick?: (issue: Issue) => void
  onColumnsReorder?: (orderedIds: string[]) => void
  readOnly?: boolean
  filters?: BoardFilters
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
        serverById.delete(issue.id)
      }
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

export function KanbanBoard({
  issues, projectId, statuses, onIssueClick, onColumnsReorder, readOnly = false, filters,
}: KanbanBoardProps) {
  const [columnOrder, setColumnOrder] = useState<string[]>(() => statuses.map((s) => s.id))
  const [columns, setColumns] = useState<ColumnMap>(() => groupByStatus(issues, statuses))
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null)

  // Delete status state
  const [deletingStatus, setDeletingStatus] = useState<ProjectStatus | null>(null)

  // Rename status state
  const [renamingStatusId, setRenamingStatusId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const dragSourceColRef = useRef<string | null>(null)
  const isDraggingRef = useRef(false)
  const qc = useQueryClient()

  const cacheKey = issueKeys.byProject(projectId, filters)

  const deleteStatus = useDeleteProjectStatus(projectId)
  const updateStatus = useUpdateProjectStatus(projectId, renamingStatusId ?? "")

  const childCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const issue of issues) {
      if (issue.parent_id) map.set(issue.parent_id, (map.get(issue.parent_id) ?? 0) + 1)
    }
    return map
  }, [issues])

  useEffect(() => {
    setColumnOrder((prev) => {
      const statusIds = new Set(statuses.map((s) => s.id))
      const filtered = prev.filter((id) => statusIds.has(id))
      const newIds = statuses.map((s) => s.id).filter((id) => !prev.includes(id))
      if (filtered.length === prev.length && newIds.length === 0) return prev
      return [...filtered, ...newIds]
    })
  }, [statuses])

  useEffect(() => {
    if (isDraggingRef.current) return
    setColumns((prev) => mergeColumnsWithServer(prev, issues, statuses))
  }, [issues, statuses])

  const orderedStatuses = [...statuses].sort((a, b) => {
    const ai = columnOrder.indexOf(a.id)
    const bi = columnOrder.indexOf(b.id)
    if (ai === -1 && bi === -1) return a.position - b.position
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const sensors = useSensors(
    useSensor(PointerSensor, readOnly
      ? { activationConstraint: { distance: Infinity } }
      : { activationConstraint: { distance: 5 } }
    )
  )

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (draggingColumnId) {
        const columnContainers = args.droppableContainers.filter((c) =>
          columnOrder.includes(c.id as string)
        )
        return rectIntersection({ ...args, droppableContainers: columnContainers })
      }
      // pointerWithin prevents oscillation when dragging cards to adjacent
      // columns (closestCorners would bounce the card back to the source column).
      // Fall back to closestCenter for gaps between columns.
      const within = pointerWithin(args)
      if (within.length > 0) return within
      return closestCenter(args)
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
      if (activeIndex === -1) return prev

      const [moved] = activeItems.splice(activeIndex, 1)
      const movedWithStatus = { ...moved, status: overColKey }

      if (overStatus) {
        overItems.push(movedWithStatus)
      } else {
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

    if (draggingColumnId) {
      setDraggingColumnId(null)
      isDraggingRef.current = false
      if (!over || active.id === over.id) return

      const oldIndex = columnOrder.indexOf(active.id as string)
      const newIndex = columnOrder.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const newOrder = arrayMove(columnOrder, oldIndex, newIndex)
      setColumnOrder(newOrder)
      onColumnsReorder?.(newOrder)
      return
    }

    if (!over) {
      isDraggingRef.current = false
      const originalCol = dragSourceColRef.current
      dragSourceColRef.current = null
      if (originalCol) {
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

    if (!originalCol || !overColKey) {
      isDraggingRef.current = false
      return
    }

    if (originalCol === overColKey) {
      isDraggingRef.current = false
      setColumns((prev) => {
        const items = prev[originalCol] ?? []
        const oldIndex = items.findIndex((i) => i.id === activeId)
        const newIndex = items.findIndex((i) => i.id === overId)
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev
        return { ...prev, [originalCol]: arrayMove(items, oldIndex, newIndex) }
      })
    } else {
      const droppedOnCard = !statuses.find((s) => s.key === overId || s.id === overId)

      if (droppedOnCard) {
        setColumns((prev) => {
          const items = [...(prev[overColKey] ?? [])]
          const fromIdx = items.findIndex((i) => i.id === activeId)
          if (fromIdx === -1) return prev

          const isBelowTarget =
            event.active.rect.current.translated != null &&
            event.active.rect.current.translated.top >
              event.over!.rect.top + event.over!.rect.height / 2

          const [removed] = items.splice(fromIdx, 1)
          const overIdx = items.findIndex((i) => i.id === overId)
          if (overIdx === -1) {
            items.splice(fromIdx, 0, removed)
            return prev
          }
          const insertAt = isBelowTarget ? overIdx + 1 : overIdx
          items.splice(insertAt, 0, removed)
          return { ...prev, [overColKey]: items }
        })
      } else {
        const ghostTop = event.active.rect.current.translated?.top ?? Infinity
        const colMidY = event.over!.rect.top + event.over!.rect.height / 2

        if (ghostTop < colMidY) {
          setColumns((prev) => {
            const items = prev[overColKey] ?? []
            const fromIdx = items.findIndex((i) => i.id === activeId)
            if (fromIdx <= 0) return prev
            return { ...prev, [overColKey]: arrayMove(items, fromIdx, 0) }
          })
        }
      }

      const prevData = qc.getQueryData<{ issues: Issue[]; count: number }>(cacheKey)

      // Cancel any in-flight refetches so stale server data doesn't
      // overwrite the optimistic update and snap the card back.
      qc.cancelQueries({ queryKey: cacheKey })

      qc.setQueryData<IssuesResponse>(cacheKey, (old) => {
        if (!old) return old
        return {
          ...old,
          issues: old.issues.map((i) =>
            i.id === activeId ? { ...i, status: overColKey } : i
          ),
        }
      })

      api
        .put(`/admin/issues/${activeId}`, { status: overColKey })
        .then(() => {
          isDraggingRef.current = false
          qc.invalidateQueries({ queryKey: cacheKey })

          const targetStatus = statuses.find((s) => s.key === overColKey)
          if (targetStatus?.category === "completed") {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
            })
          }
        })
        .catch(() => {
          isDraggingRef.current = false
          if (prevData) qc.setQueryData(cacheKey, prevData)
          setColumns(groupByStatus(prevData?.issues ?? issues, statuses))
          toast.error("Failed to update issue status")
        })
    }
  }

  // ── Delete status ───────────────────────────────────────────────────────────

  const handleDeleteStatus = (status: ProjectStatus) => {
    setDeletingStatus(status)
  }

  const handleConfirmDelete = async (targetStatusId: string | null) => {
    if (!deletingStatus) return

    const issuesToMove = columns[deletingStatus.key] ?? []
    if (issuesToMove.length > 0) {
      const targetStatus = statuses.find((s) => s.id === targetStatusId)
      if (!targetStatus) return
      try {
        await Promise.all(
          issuesToMove.map((issue) =>
            api.put(`/admin/issues/${issue.id}`, { status: targetStatus.key })
          )
        )
        qc.invalidateQueries({ queryKey: issueKeys.byProject(projectId) })
      } catch {
        toast.error("Failed to move issues")
        return
      }
    }

    deleteStatus.mutate(deletingStatus.id, {
      onSuccess: () => {
        toast.success(`Status "${deletingStatus.name}" deleted`)
        setDeletingStatus(null)
      },
      onError: () => toast.error("Failed to delete status"),
    })
  }

  // ── Rename status ───────────────────────────────────────────────────────────

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim()
    if (!trimmed || !renamingStatusId) return
    updateStatus.mutate({ name: trimmed }, {
      onSuccess: () => {
        toast.success("Status renamed")
        setRenamingStatusId(null)
      },
      onError: () => toast.error("Failed to rename status"),
    })
  }

  const handleRenameCancel = () => {
    setRenamingStatusId(null)
  }

  // ───────────────────────────────────────────────────────────────────────────

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
      <div className="flex gap-4 min-h-full overflow-x-auto px-6 py-4 pb-6">
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
              onRename={readOnly ? undefined : () => {
                setRenamingStatusId(status.id)
                setRenameValue(status.name)
              }}
              onDelete={readOnly ? undefined : () => handleDeleteStatus(status)}
              isRenaming={renamingStatusId === status.id}
              renameValue={renamingStatusId === status.id ? renameValue : ""}
              onRenameChange={setRenameValue}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={handleRenameCancel}
            />
          ))}
        </SortableContext>

        {!readOnly && <AddStatusColumn projectId={projectId} />}
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

      {deletingStatus && (
        <DeleteStatusDialog
          open={!!deletingStatus}
          statusName={deletingStatus.name}
          issueCount={columns[deletingStatus.key]?.length ?? 0}
          otherStatuses={statuses.filter((s) => s.id !== deletingStatus.id)}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingStatus(null)}
          isLoading={deleteStatus.isPending}
        />
      )}
    </DndContext>
  )
}
