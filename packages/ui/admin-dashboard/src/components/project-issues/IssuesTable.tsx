import type { Issue } from "@/api/hooks/useIssues"
import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"
import type { Sprint } from "@/api/hooks/useSprints"
import type { TaskList } from "@/api/hooks/useTaskLists"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { GRID } from "./IssueRow"
import { TaskListGroup } from "./TaskListGroup"

interface IssuesTableProps {
  isLoading: boolean
  totalCount: number
  allIssuesCount: number
  topLevel: Issue[]
  taskLists: TaskList[]
  groupedByList: Record<string, Issue[]>
  childrenMap: Record<string, Issue[]>
  projectId: string
  statuses: ProjectStatus[]
  statusLabels: Record<string, string>
  statusColorMap: Record<string, string>
  sprints: Sprint[]
  workspace: string
  projectKey: string
  onOpen: (issue: Issue) => void
  onCreateIssue: () => void
  onAddIssue: (taskListId: string | null) => void
  onAddChild: (parentId: string) => void
  onRenameList: (id: string, name: string) => void
  onDeleteList: (id: string) => void
}

/** Desktop scrollable issues table grouped by task list (hidden on mobile). */
export function IssuesTable({
  isLoading,
  totalCount,
  allIssuesCount,
  topLevel,
  taskLists,
  groupedByList,
  childrenMap,
  projectId,
  statuses,
  statusLabels,
  statusColorMap,
  sprints,
  workspace,
  projectKey,
  onOpen,
  onCreateIssue,
  onAddIssue,
  onAddChild,
  onRenameList,
  onDeleteList,
}: IssuesTableProps) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <div className="min-w-[1025px]">
        {/* Table header */}
        <div className={cn("grid items-center py-2.5 border-b border-border", GRID)}>
          <span className="text-xs font-medium text-[#6b7280] sticky left-0 z-10 bg-white dark:bg-card pl-6">ID</span>
          <span className="text-xs font-medium text-[#6b7280] sticky left-[110px] z-10 bg-white dark:bg-card">Title</span>
          <span className="text-xs font-medium text-[#6b7280]">Status</span>
          <span className="text-xs font-medium text-[#6b7280]">Priority</span>
          <span className="text-xs font-medium text-[#6b7280]">Sprint</span>
          <span className="text-xs font-medium text-[#6b7280]">Due Date</span>
          <span className="text-xs font-medium text-[#6b7280]">Assignees</span>
          <span className="pr-6" />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn("grid items-center px-6 py-3 gap-4", GRID)}>
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
                <span />
              </div>
            ))}
          </div>
        ) : totalCount === 0 && allIssuesCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium mb-1">No issues yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first issue to start tracking work.
            </p>
            <Button size="sm" onClick={onCreateIssue}>
              <Plus className="h-4 w-4" />
              Create issue
            </Button>
          </div>
        ) : topLevel.length === 0 && allIssuesCount > 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No issues match your filters.</p>
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <div className="divide-y divide-border">
              {/* Task list groups */}
              {taskLists.map((tl) => (
                <TaskListGroup
                  key={tl.id}
                  taskList={tl}
                  issues={groupedByList[tl.id] ?? []}
                  childrenMap={childrenMap}
                  projectId={projectId}
                  statuses={statuses}
                  statusLabels={statusLabels}
                  statusColorMap={statusColorMap}
                  sprints={sprints}
                  workspace={workspace}
                  projectKey={projectKey}
                  onOpen={onOpen}
                  onAddIssue={onAddIssue}
                  onAddChild={onAddChild}
                  onRenameList={onRenameList}
                  onDeleteList={onDeleteList}
                />
              ))}

              {/* "No List" group — always show if there are ungrouped issues or no task lists */}
              {(groupedByList["__none__"]?.length > 0 || taskLists.length === 0) && (
                <TaskListGroup
                  taskList={null}
                  issues={groupedByList["__none__"] ?? []}
                  childrenMap={childrenMap}
                  projectId={projectId}
                  statuses={statuses}
                  statusLabels={statusLabels}
                  statusColorMap={statusColorMap}
                  sprints={sprints}
                  workspace={workspace}
                  projectKey={projectKey}
                  onOpen={onOpen}
                  onAddIssue={onAddIssue}
                  onAddChild={onAddChild}
                />
              )}
            </div>
          </TooltipProvider>
        )}
      </div>{/* /min-w */}
    </div>
  )
}
