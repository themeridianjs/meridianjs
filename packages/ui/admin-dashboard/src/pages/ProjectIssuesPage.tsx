import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useIssues, type Issue } from "@/api/hooks/useIssues"
import { useUserMap } from "@/api/hooks/useUsers"
import { useProjectStatuses } from "@/api/hooks/useProjectStatuses"
import { IssueDetail } from "@/components/issues/IssueDetail"
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_COLORS,
} from "@/lib/constants"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Search, ArrowUp, ArrowDown, Minus, Zap, Circle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const PriorityIcon = ({ priority }: { priority: string }) => {
  const cls = cn("h-3.5 w-3.5 shrink-0", ISSUE_PRIORITY_COLORS[priority])
  switch (priority) {
    case "urgent": return <Zap className={cls} />
    case "high": return <ArrowUp className={cls} />
    case "medium": return <Minus className={cls} />
    case "low": return <ArrowDown className={cls} />
    default: return <Circle className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
  }
}

const STATUS_DOT: Record<string, string> = {
  backlog: "bg-zinc-400",
  todo: "bg-zinc-500",
  in_progress: "bg-indigo-500",
  in_review: "bg-amber-500",
  done: "bg-emerald-500",
  cancelled: "bg-zinc-300",
}

export function ProjectIssuesPage() {
  const { workspace, projectKey } = useParams<{ workspace: string; projectKey: string }>()
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  const navigate = useNavigate()
  const { data: project } = useProjectByKey(projectKey ?? "")
  const projectId = project?.id ?? ""
  const { data: issues, isLoading } = useIssues(projectId || undefined)
  const { data: userMap } = useUserMap()
  const { data: projectStatuses } = useProjectStatuses(projectId || undefined)

  const statusLabels = projectStatuses && projectStatuses.length > 0
    ? Object.fromEntries(projectStatuses.map((s) => [s.key, s.name]))
    : ISSUE_STATUS_LABELS

  // Map status key → hex color for dot indicator
  const statusColors = projectStatuses && projectStatuses.length > 0
    ? Object.fromEntries(projectStatuses.map((s) => [s.key, s.color]))
    : null

  if (!projectKey) return null

  const filtered = (issues ?? []).filter((issue) => {
    const matchesSearch =
      !search ||
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.identifier.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || issue.status === statusFilter
    const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <div className="p-2">
      {/* Content card */}
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h1 className="text-base font-semibold">Issues</h1>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px] bg-transparent">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                {Object.entries(statusLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px] bg-transparent">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All priorities</SelectItem>
                {Object.entries(ISSUE_PRIORITY_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-[200px] text-xs bg-transparent"
            />
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[80px_1fr_130px_100px_110px_120px_32px] items-center px-6 py-2.5 border-b border-border">
          <span className="text-xs font-medium text-[#6b7280]">ID</span>
          <span className="text-xs font-medium text-[#6b7280]">Title</span>
          <span className="text-xs font-medium text-[#6b7280]">Status</span>
          <span className="text-xs font-medium text-[#6b7280]">Priority</span>
          <span className="text-xs font-medium text-[#6b7280]">Assignees</span>
          <span className="text-xs font-medium text-[#6b7280]">Created</span>
          <span />
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="grid grid-cols-[80px_1fr_130px_100px_110px_120px_32px] items-center px-6 py-3 gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <span />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium mb-1">
              {search || statusFilter !== "all" || priorityFilter !== "all"
                ? "No issues match your filters"
                : "No issues yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {search || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Create your first issue to start tracking work."}
            </p>
            {!search && statusFilter === "all" && priorityFilter === "all" && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create issue
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((issue) => (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                className="group grid grid-cols-[80px_1fr_130px_100px_110px_120px_32px] items-center px-6 py-3 hover:bg-[#f9fafb] dark:hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <span className="text-xs font-mono text-muted-foreground">
                  {issue.identifier}
                </span>
                <span className="text-sm text-foreground truncate pr-4">
                  {issue.title}
                </span>
                <div className="flex items-center gap-1.5">
                  {statusColors ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: statusColors[issue.status] ?? "#94a3b8" }}
                    />
                  ) : (
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[issue.status] ?? "bg-zinc-400")} />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {statusLabels[issue.status] ?? issue.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PriorityIcon priority={issue.priority} />
                  <span className="text-xs text-muted-foreground">
                    {ISSUE_PRIORITY_LABELS[issue.priority] ?? issue.priority}
                  </span>
                </div>
                <TooltipProvider delayDuration={200}>
                  <div className="flex -space-x-1.5">
                    {(issue.assignee_ids ?? []).slice(0, 3).map((uid) => {
                      const u = userMap?.get(uid)
                      return (
                        <Tooltip key={uid}>
                          <TooltipTrigger asChild>
                            <Avatar className="h-6 w-6 border-2 border-background ring-0 cursor-default relative hover:z-10 transition-[z-index]">
                              <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                {u?.initials ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {u?.name ?? uid}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                    {(issue.assignee_ids?.length ?? 0) > 3 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="h-5 w-5 border-2 border-background cursor-default">
                            <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                              +{(issue.assignee_ids?.length ?? 0) - 3}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {(issue.assignee_ids ?? []).slice(3).map(uid => userMap?.get(uid)?.name ?? uid).join(", ")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(issue.created_at), "MMM d, yyyy")}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/${workspace}/projects/${projectKey}/issues/${issue.id}`)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-border text-muted-foreground hover:text-foreground"
                  title="Open full page"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              1 — {filtered.length} of {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>1 of 1 pages</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>Prev</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>Next</Button>
            </div>
          </div>
        )}
      </div>

      <IssueDetail
        issue={selectedIssue}
        projectId={projectId}
        open={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />
      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
      />
    </div>
  )
}
