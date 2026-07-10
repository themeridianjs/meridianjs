import { useState } from "react"
import { useParams } from "react-router-dom"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useIssues, type Issue } from "@/api/hooks/useIssues"
import { useProjectStatuses, type ProjectStatus } from "@/api/hooks/useProjectStatuses"
import { useSprints } from "@/api/hooks/useSprints"
import { useTaskLists, useUpdateTaskList, useDeleteTaskList } from "@/api/hooks/useTaskLists"
import { IssueDetail } from "@/components/issues/IssueDetail"
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog"
import { IssuesToolbar } from "@/components/project-issues/IssuesToolbar"
import { IssuesFilterBar } from "@/components/project-issues/IssuesFilterBar"
import { IssuesTable } from "@/components/project-issues/IssuesTable"
import { MobileIssuesList } from "@/components/project-issues/MobileIssuesList"
import { ISSUE_STATUS_LABELS } from "@/lib/constants"
import { toast } from "sonner"
import { WidgetZone } from "@/components/WidgetZone"

interface CreateDialogState {
  open: boolean
  defaultTaskListId?: string | null
  defaultParentId?: string | null
}

export function ProjectIssuesPage() {
  const { workspace, projectKey } = useParams<{ workspace: string; projectKey: string }>()
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({ open: false })
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [sprintFilter, setSprintFilter] = useState("all")

  const { data: project } = useProjectByKey(projectKey ?? "")
  const projectId = project?.id ?? ""
  const { data: issues, isLoading } = useIssues(projectId || undefined)
  const { data: projectStatuses } = useProjectStatuses(projectId || undefined)
  const { data: sprints } = useSprints(projectId || undefined)
  const { data: taskLists } = useTaskLists(projectId || undefined)
  const updateTaskList = useUpdateTaskList(projectId)
  const deleteTaskList = useDeleteTaskList(projectId)

  const statuses: ProjectStatus[] =
    projectStatuses && projectStatuses.length > 0
      ? projectStatuses
      : Object.entries(ISSUE_STATUS_LABELS).map(([key, name], i) => ({
        id: key, project_id: projectId, key, name,
        color: { backlog: "#94a3b8", todo: "#64748b", in_progress: "#6366f1", in_review: "#f59e0b", done: "#10b981", cancelled: "#9ca3af" }[key] ?? "#94a3b8",
        category: { backlog: "backlog", todo: "unstarted", in_progress: "started", in_review: "started", done: "completed", cancelled: "cancelled" }[key] as any ?? "backlog",
        position: i,
      }))

  const statusLabels = Object.fromEntries(statuses.map((s) => [s.key, s.name]))
  const statusColorMap = Object.fromEntries(statuses.map((s) => [s.key, s.color]))
  const allSprints = sprints ?? []

  if (!projectKey || !workspace) return null

  // ── Filter + sort all issues ─────────────────────────────────────────────
  const allFiltered = (issues ?? [])
    .filter((issue) => {
      const matchesSearch =
        !search ||
        issue.title.toLowerCase().includes(search.toLowerCase()) ||
        issue.identifier.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || issue.status === statusFilter
      const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter
      const matchesSprint =
        sprintFilter === "all" ||
        (sprintFilter === "none" ? !issue.sprint_id : issue.sprint_id === sprintFilter)
      return matchesSearch && matchesStatus && matchesPriority && matchesSprint
    })
    .sort((a, b) => {
      const aNum = parseInt(a.identifier.split("-")[1] ?? "0", 10)
      const bNum = parseInt(b.identifier.split("-")[1] ?? "0", 10)
      return aNum - bNum
    })

  // ── When a child matches filters, pull in its ancestor chain for context ──
  const allIssueMap = new Map((issues ?? []).map((i) => [i.id, i]))
  const filteredIds = new Set(allFiltered.map((i) => i.id))
  const visibleIds = new Set(filteredIds)

  for (const issue of allFiltered) {
    let parentId = issue.parent_id
    while (parentId) {
      if (visibleIds.has(parentId)) break
      visibleIds.add(parentId)
      parentId = allIssueMap.get(parentId)?.parent_id ?? null
    }
  }

  // ── Build parent→children map from all visible child issues ─────────────
  const childrenMap: Record<string, Issue[]> = {}
  for (const id of visibleIds) {
    const issue = allIssueMap.get(id)!
    if (issue.parent_id && visibleIds.has(issue.parent_id)) {
      if (!childrenMap[issue.parent_id]) childrenMap[issue.parent_id] = []
      childrenMap[issue.parent_id].push(issue)
    }
  }
  // Sort children by identifier number
  for (const kids of Object.values(childrenMap)) {
    kids.sort((a, b) => {
      const aNum = parseInt(a.identifier.split("-")[1] ?? "0", 10)
      const bNum = parseInt(b.identifier.split("-")[1] ?? "0", 10)
      return aNum - bNum
    })
  }

  // Top-level: visible issues with no parent_id (or whose parent isn't visible)
  const topLevel = Array.from(visibleIds)
    .map((id) => allIssueMap.get(id)!)
    .filter((i) => !i.parent_id || !visibleIds.has(i.parent_id))
    .sort((a, b) => {
      const aNum = parseInt(a.identifier.split("-")[1] ?? "0", 10)
      const bNum = parseInt(b.identifier.split("-")[1] ?? "0", 10)
      return aNum - bNum
    })
  const totalCount = allFiltered.length

  // ── Group top-level issues by task_list_id ────────────────────────────────
  const knownListIds = new Set((taskLists ?? []).map((tl) => tl.id))
  const groupedByList: Record<string, Issue[]> = { __none__: [] }
  for (const tl of taskLists ?? []) {
    groupedByList[tl.id] = []
  }
  for (const issue of topLevel) {
    const key = (issue.task_list_id && knownListIds.has(issue.task_list_id))
      ? issue.task_list_id
      : "__none__"
    groupedByList[key].push(issue)
  }

  // ── Task list CRUD handlers ───────────────────────────────────────────────
  function handleRenameList(id: string, name: string) {
    updateTaskList.mutate({ id, name }, {
      onError: () => toast.error("Failed to rename list"),
    })
  }

  function handleDeleteList(id: string) {
    const list = taskLists?.find((tl) => tl.id === id)
    if (!confirm(`Delete list "${list?.name}"? Issues in this list will be moved to No List.`)) return
    deleteTaskList.mutate(id, {
      onSuccess: () => toast.success("List deleted"),
      onError: () => toast.error("Failed to delete list"),
    })
  }

  return (
    <div className="p-2 pb-24 md:pb-2">
      <WidgetZone zone="project.issues.before" props={{ projectId }} />
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">

        {/* Card header */}
        <IssuesToolbar
          projectId={projectId}
          onCreateIssue={() => setCreateDialog({ open: true })}
        />

        {/* Toolbar */}
        <IssuesFilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          sprintFilter={sprintFilter}
          onSprintFilterChange={setSprintFilter}
          statuses={statuses}
          sprints={allSprints}
        />

        {/* Desktop: scrollable table (hidden on mobile) */}
        <IssuesTable
          isLoading={isLoading}
          totalCount={totalCount}
          allIssuesCount={(issues ?? []).length}
          topLevel={topLevel}
          taskLists={taskLists ?? []}
          groupedByList={groupedByList}
          childrenMap={childrenMap}
          projectId={projectId}
          statuses={statuses}
          statusLabels={statusLabels}
          statusColorMap={statusColorMap}
          sprints={allSprints}
          workspace={workspace}
          projectKey={projectKey}
          onOpen={setSelectedIssue}
          onCreateIssue={() => setCreateDialog({ open: true })}
          onAddIssue={(id) => setCreateDialog({ open: true, defaultTaskListId: id })}
          onAddChild={(parentId) => setCreateDialog({ open: true, defaultParentId: parentId })}
          onRenameList={handleRenameList}
          onDeleteList={handleDeleteList}
        />

        {/* Mobile: flat card list (no horizontal scroll) */}
        <MobileIssuesList
          isLoading={isLoading}
          topLevel={topLevel}
          statusLabels={statusLabels}
          statusColorMap={statusColorMap}
          sprints={allSprints}
          workspace={workspace}
          projectKey={projectKey}
        />

        {/* Footer */}
        {!isLoading && totalCount > 0 && (
          <div className="flex items-center px-6 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {totalCount} issue{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <WidgetZone zone="project.issues.after" props={{ projectId }} />

      <IssueDetail
        issue={selectedIssue}
        projectId={projectId}
        open={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />
      <CreateIssueDialog
        open={createDialog.open}
        onClose={() => setCreateDialog({ open: false })}
        projectId={projectId}
        defaultTaskListId={createDialog.defaultTaskListId}
        defaultParentId={createDialog.defaultParentId}
      />
    </div>
  )
}
