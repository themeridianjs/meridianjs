import { useState } from "react"
import type { Issue } from "@/api/hooks/useIssues"
import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"
import type { Sprint } from "@/api/hooks/useSprints"
import type { TaskList } from "@/api/hooks/useTaskLists"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Plus,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { IssueRow } from "./IssueRow"

interface TaskListGroupProps {
  taskList: TaskList | null  // null = "No List" group
  issues: Issue[]
  childrenMap: Record<string, Issue[]>
  projectId: string
  statuses: ProjectStatus[]
  statusLabels: Record<string, string>
  statusColorMap: Record<string, string>
  sprints: Sprint[]
  workspace: string
  projectKey: string
  onOpen: (issue: Issue) => void
  onAddIssue: (taskListId: string | null) => void
  onAddChild: (parentId: string) => void
  onRenameList?: (id: string, name: string) => void
  onDeleteList?: (id: string) => void
}

export function TaskListGroup({
  taskList,
  issues,
  childrenMap,
  projectId,
  statuses,
  statusLabels,
  statusColorMap,
  sprints,
  workspace,
  projectKey,
  onOpen,
  onAddIssue,
  onAddChild,
  onRenameList,
  onDeleteList,
}: TaskListGroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(taskList?.name ?? "")

  const totalChildCount = issues.reduce((sum, i) => sum + (childrenMap[i.id]?.length ?? 0), 0)
  const totalCount = issues.length + totalChildCount

  const handleRenameSubmit = () => {
    if (taskList && renameValue.trim() && onRenameList) {
      onRenameList(taskList.id, renameValue.trim())
    }
    setIsRenaming(false)
  }

  return (
    <div>
      {/* Group header */}
      <div className="flex items-center gap-2 px-6 py-2 bg-muted/20 border-b border-border group/header">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsed
                ? <ChevronRight className="h-3.5 w-3.5" />
                : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? "Expand" : "Collapse"}</TooltipContent>
        </Tooltip>

        {taskList ? (
          isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit()
                if (e.key === "Escape") { setIsRenaming(false); setRenameValue(taskList.name) }
              }}
              className="text-xs font-semibold text-foreground bg-transparent border-b border-indigo-400 outline-none px-0.5"
            />
          ) : (
            <span className="text-xs font-semibold text-foreground">{taskList.name}</span>
          )
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">No List</span>
        )}

        <span className="text-[11px] text-muted-foreground/60 font-mono">{totalCount}</span>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onAddIssue(taskList?.id ?? null)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
          >
            <Plus className="h-3 w-3" />
            Add issue
          </button>

          {taskList && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">More options</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  className="text-xs gap-2 cursor-pointer"
                  onClick={() => { setIsRenaming(true); setRenameValue(taskList.name) }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => onDeleteList?.(taskList.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Issues */}
      {!collapsed && (
        <div className="divide-y divide-border/60">
          {issues.length === 0 ? (
            <div className="px-14 py-3 text-xs text-muted-foreground/50 italic">
              No issues in this list
            </div>
          ) : (
            issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                projectId={projectId}
                statuses={statuses}
                statusLabels={statusLabels}
                statusColorMap={statusColorMap}
                sprints={sprints}
                workspace={workspace}
                projectKey={projectKey}
                onOpen={onOpen}
                children={childrenMap[issue.id] ?? []}
                childrenMap={childrenMap}
                onAddChild={onAddChild}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
