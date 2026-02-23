import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { useIssue, useUpdateIssue, useIssues } from "@/api/hooks/useIssues"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useProjectStatuses } from "@/api/hooks/useProjectStatuses"
import { useSprints, type Sprint } from "@/api/hooks/useSprints"
import { useTaskLists } from "@/api/hooks/useTaskLists"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog"
import { IssueActivity } from "@/components/issues/IssueActivity"
import { RichTextEditor, RichTextContent } from "@/components/ui/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_TYPE_LABELS,
} from "@/lib/constants"
import {
  ChevronLeft, Pencil, Plus,
  Circle, Clock, ArrowRight, Eye, CheckCircle2, XCircle,
  Zap, ArrowUp, Minus, ArrowDown,
  Bug, Sparkles, CheckSquare, HelpCircle, Layers, FolderOpen,
  CornerDownRight, ChevronUp,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ── Helpers ───────────────────────────────────────────────────────────────────

function sprintDateRange(sprint: Sprint): string | null {
  if (!sprint.start_date && !sprint.end_date) return null
  const start = sprint.start_date ? format(new Date(sprint.start_date), "MMM d") : "—"
  const end = sprint.end_date ? format(new Date(sprint.end_date), "MMM d") : "—"
  return `${start} – ${end}`
}

// ── Property row ──────────────────────────────────────────────────────────────

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-20">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// ── Status / Priority / Type icon helpers ─────────────────────────────────────

const STATUS_ICONS: Record<string, React.ReactNode> = {
  backlog: <Circle className="h-3 w-3 text-zinc-400" />,
  todo: <Circle className="h-3 w-3 text-zinc-500" strokeWidth={2.5} />,
  in_progress: <Clock className="h-3 w-3 text-indigo-500" />,
  in_review: <Eye className="h-3 w-3 text-amber-500" />,
  done: <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
  cancelled: <XCircle className="h-3 w-3 text-zinc-400" />,
}

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  urgent: <Zap className="h-3 w-3 text-red-500" />,
  high: <ArrowUp className="h-3 w-3 text-orange-500" />,
  medium: <Minus className="h-3 w-3 text-yellow-500" />,
  low: <ArrowDown className="h-3 w-3 text-blue-400" />,
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  bug: <Bug className="h-3 w-3 text-red-500" />,
  feature: <Sparkles className="h-3 w-3 text-purple-500" />,
  task: <CheckSquare className="h-3 w-3 text-blue-500" />,
  chore: <ArrowRight className="h-3 w-3 text-zinc-500" />,
}

function IconSelect({
  value,
  onValueChange,
  options,
  icons,
  placeholder,
}: {
  value: string
  onValueChange: (v: string) => void
  options: Record<string, string>
  icons: Record<string, React.ReactNode>
  placeholder?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-0 gap-1.5 focus:ring-0 hover:bg-accent rounded-md pl-1">
        <div className="flex items-center gap-1.5">
          {icons[value] ?? <HelpCircle className="h-3 w-3 text-muted-foreground" />}
          <span>{options[value] ?? placeholder ?? ""}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([v, l]) => (
          <SelectItem key={v} value={v} className="text-xs">
            <div className="flex items-center gap-2">
              {icons[v]}
              {l}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function IssueDetailPage() {
  const { workspace, projectKey, issueId } = useParams<{ workspace: string; projectKey: string; issueId: string }>()
  const navigate = useNavigate()

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [createChildOpen, setCreateChildOpen] = useState(false)

  const { data: project } = useProjectByKey(projectKey ?? "")
  const projectId = project?.id ?? ""
  const { data: issue, isLoading } = useIssue(issueId ?? "")
  const updateIssue = useUpdateIssue(issueId ?? "", projectId)
  const { data: projectStatuses } = useProjectStatuses(projectId || undefined)
  const { data: sprints } = useSprints(projectId || undefined)
  const { data: taskLists } = useTaskLists(projectId || undefined)
  const { data: allIssues } = useIssues(projectId || undefined)
  const activeSprints = (sprints ?? []).filter((s) => s.status !== "completed")

  const parentIssue = issue?.parent_id ? allIssues?.find((i) => i.id === issue.parent_id) : null
  const childIssues = allIssues?.filter((i) => i.parent_id === issueId) ?? []
  const currentTaskList = issue?.task_list_id ? taskLists?.find((tl) => tl.id === issue.task_list_id) : null

  const statusOptions = projectStatuses && projectStatuses.length > 0
    ? Object.fromEntries(projectStatuses.map((s) => [s.key, s.name]))
    : ISSUE_STATUS_LABELS

  const statusIcons: Record<string, React.ReactNode> = projectStatuses && projectStatuses.length > 0
    ? Object.fromEntries(projectStatuses.map((s) => [
      s.key,
      s.category === "completed"
        ? <CheckCircle2 className="h-3 w-3" style={{ color: s.color }} />
        : s.category === "started"
          ? <Clock className="h-3 w-3" style={{ color: s.color }} />
          : <Circle className="h-3 w-3" style={{ color: s.color }} />,
    ]))
    : STATUS_ICONS

  useEffect(() => {
    if (issue) {
      setEditTitle(issue.title)
      setEditDescription(issue.description ?? "")
    }
    setIsEditing(false)
  }, [issue?.id])

  if (!projectKey || !issueId) return null

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return
    updateIssue.mutate(
      { title: editTitle.trim(), description: editDescription.trim() || undefined },
      {
        onSuccess: () => {
          setIsEditing(false)
          toast.success("Issue updated")
        },
        onError: () => toast.error("Failed to update issue"),
      }
    )
  }

  const handleCancelEdit = () => {
    if (issue) {
      setEditTitle(issue.title)
      setEditDescription(issue.description ?? "")
    }
    setIsEditing(false)
  }

  const handlePropUpdate = (data: Parameters<typeof updateIssue.mutate>[0], label: string) => {
    updateIssue.mutate(data, {
      onSuccess: () => toast.success(`${label} updated`),
      onError: () => toast.error(`Failed to update ${label.toLowerCase()}`),
    })
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading || !issue) {
    return (
      <div className="min-h-full bg-[hsl(60_5%_96%)] dark:bg-background">
        <div className="sticky top-0 z-10 h-[57px] bg-white dark:bg-card border-b border-border" />
        <div className="px-2 py-2">
          <div className="grid grid-cols-[1fr_256px] gap-5">
            <div className="space-y-4">
              <div className="bg-white dark:bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-32 w-full" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <Skeleton className="h-[280px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-full bg-[hsl(60_5%_96%)] dark:bg-background">
      {/* ── Sticky top bar ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 h-[57px] bg-white dark:bg-card border-b border-border">
        {/* Left: breadcrumb */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-muted-foreground hover:text-foreground px-2"
            onClick={() => navigate(`/${workspace}/projects/${projectKey}/issues`)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {project?.name ?? "Issues"}
          </Button>
          <span className="text-border">/</span>
          <span className="font-mono text-xs text-muted-foreground">{issue.identifier}</span>
          <Badge variant="muted" className="text-[10px] ml-1">
            {ISSUE_TYPE_LABELS[issue.type] ?? issue.type}
          </Badge>
        </div>

        {/* Right: edit actions */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editTitle.trim() || updateIssue.isPending}
                className="px-4"
              >
                {updateIssue.isPending ? "Saving…" : "Save changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="px-2 py-2">
        <div className="grid grid-cols-[1fr_256px] gap-5 items-start">

          {/* ── Left column ───────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Card 1: Title + Description */}
            <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              {/* Title */}
              <div className="px-6 pt-6 pb-3">
                {isEditing ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault() }}
                    className={cn(
                      "w-full text-xl font-semibold leading-snug text-foreground",
                      "bg-transparent border-0 outline-none resize-none",
                      "placeholder:text-muted-foreground/40"
                    )}
                  />
                ) : (
                  <h1 className="text-xl font-semibold text-foreground leading-snug">
                    {issue.title}
                  </h1>
                )}
              </div>

              {/* Description label */}
              <div className="flex items-center gap-2 px-6 pb-2">
                <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                  Description
                </span>
              </div>

              {/* Description content */}
              {isEditing ? (
                <RichTextEditor
                  content={editDescription}
                  onChange={setEditDescription}
                  placeholder="Add a description…"
                  className="border-t border-border/50 min-h-[280px]"
                />
              ) : issue.description ? (
                <div className="border-t border-border/50">
                  <RichTextContent html={issue.description} className="px-5 py-4" />
                </div>
              ) : (
                <div className="border-t border-border/50 px-6 py-4">
                  <p className="text-sm text-muted-foreground/50 italic">No description</p>
                </div>
              )}
            </div>

            {/* Card 2: Child Issues */}
            <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Child Issues
                </p>
                <button
                  onClick={() => setCreateChildOpen(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add child issue
                </button>
              </div>
              {childIssues.length === 0 ? (
                <div className="px-5 py-4 text-xs text-muted-foreground/50 italic">
                  No child issues yet
                </div>
              ) : (
                <div className="px-5 py-2 divide-y divide-border/40">
                  {childIssues.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 py-2 text-xs">
                      <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => navigate(`/${workspace}/projects/${projectKey}/issues/${child.id}`)}
                        className="font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        {child.identifier}
                      </button>
                      <button
                        onClick={() => navigate(`/${workspace}/projects/${projectKey}/issues/${child.id}`)}
                        className="text-foreground hover:text-foreground/70 truncate text-left transition-colors"
                      >
                        {child.title}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 3: Comments + Activity */}
            <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <IssueActivity issueId={issueId} />
            </div>

          </div>

          {/* ── Right — properties ──────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Properties
                </p>
              </div>

              <div className="px-4 py-1">
                <PropertyRow label="Status">
                  <IconSelect
                    value={issue.status}
                    onValueChange={(v) => handlePropUpdate({ status: v }, "Status")}
                    options={statusOptions}
                    icons={statusIcons}
                  />
                </PropertyRow>

                <PropertyRow label="Priority">
                  <IconSelect
                    value={issue.priority}
                    onValueChange={(v) => handlePropUpdate({ priority: v }, "Priority")}
                    options={ISSUE_PRIORITY_LABELS}
                    icons={PRIORITY_ICONS}
                  />
                </PropertyRow>

                <PropertyRow label="Type">
                  <IconSelect
                    value={issue.type}
                    onValueChange={(v) => handlePropUpdate({ type: v }, "Type")}
                    options={ISSUE_TYPE_LABELS}
                    icons={TYPE_ICONS}
                  />
                </PropertyRow>

                <PropertyRow label="Assignees">
                  <AssigneeSelector
                    value={issue.assignee_ids ?? []}
                    onChange={(assignee_ids) => handlePropUpdate({ assignee_ids }, "Assignees")}
                    disabled={updateIssue.isPending}
                  />
                </PropertyRow>

                <PropertyRow label="Sprint">
                  <Select
                    value={issue.sprint_id ?? "none"}
                    onValueChange={(v) =>
                      handlePropUpdate({ sprint_id: v === "none" ? null : v }, "Sprint")
                    }
                  >
                    <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-0 gap-1.5 focus:ring-0 hover:bg-accent rounded-md pl-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Layers className="h-3 w-3 shrink-0 text-muted-foreground" />
                        {issue.sprint_id ? (
                          (() => {
                            const s = activeSprints.find((sp) => sp.id === issue.sprint_id)
                              ?? sprints?.find((sp) => sp.id === issue.sprint_id)
                            if (!s) return <span className="truncate">{issue.sprint_id.slice(0, 8)}…</span>
                            const range = sprintDateRange(s)
                            return (
                              <span className="truncate">
                                {s.name}
                                {range && <span className="text-muted-foreground ml-1">· {range}</span>}
                              </span>
                            )
                          })()
                        ) : (
                          <span className="text-muted-foreground">No sprint</span>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs text-muted-foreground">
                        No sprint
                      </SelectItem>
                      {activeSprints.map((s) => {
                        const range = sprintDateRange(s)
                        return (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            <div className="flex items-baseline gap-1.5">
                              <span>{s.name}</span>
                              {range && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  {range}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </PropertyRow>

                {(taskLists ?? []).length > 0 && (
                  <PropertyRow label="List">
                    <Select
                      value={issue.task_list_id ?? "none"}
                      onValueChange={(v) =>
                        handlePropUpdate({ task_list_id: v === "none" ? null : v }, "List")
                      }
                    >
                      <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-0 gap-1.5 focus:ring-0 hover:bg-accent rounded-md pl-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FolderOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className={currentTaskList ? "truncate" : "text-muted-foreground"}>
                            {currentTaskList?.name ?? "No list"}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs text-muted-foreground">No list</SelectItem>
                        {(taskLists ?? []).map((tl) => (
                          <SelectItem key={tl.id} value={tl.id} className="text-xs">{tl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PropertyRow>
                )}

                {parentIssue && (
                  <PropertyRow label="Parent">
                    <button
                      onClick={() => navigate(`/${workspace}/projects/${projectKey}/issues/${parentIssue.id}`)}
                      className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors text-left w-full min-w-0"
                    >
                      <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-mono text-muted-foreground shrink-0">{parentIssue.identifier}</span>
                      <span className="text-foreground truncate">{parentIssue.title}</span>
                    </button>
                  </PropertyRow>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="bg-white dark:bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Details
                </p>
              </div>
              <div className="px-4 pt-3 pb-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">
                    {format(new Date(issue.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="text-foreground">
                    {format(new Date(issue.updated_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <CreateIssueDialog
      open={createChildOpen}
      onClose={() => setCreateChildOpen(false)}
      projectId={projectId}
      defaultParentId={issueId}
      defaultTaskListId={issue.task_list_id}
    />
    </>
  )
}
