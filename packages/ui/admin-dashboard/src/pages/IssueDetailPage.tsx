import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { useIssue, useUpdateIssue } from "@/api/hooks/useIssues"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useProjectStatuses } from "@/api/hooks/useProjectStatuses"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
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
  ChevronLeft, Pencil,
  Circle, Clock, ArrowRight, Eye, CheckCircle2, XCircle,
  Zap, ArrowUp, Minus, ArrowDown,
  Bug, Sparkles, CheckSquare, HelpCircle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

  const { data: project } = useProjectByKey(projectKey ?? "")
  const projectId = project?.id ?? ""
  const { data: issue, isLoading } = useIssue(issueId ?? "")
  const updateIssue = useUpdateIssue(issueId ?? "", projectId)
  const { data: projectStatuses } = useProjectStatuses(projectId || undefined)

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
            <div className="bg-white dark:bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-[280px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
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

          {/* ── Left — title + description + activity ─────────────────────── */}
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

            {/* ── Comments + Activity ──────────────────────────────────── */}
            <IssueActivity issueId={issueId} className="border-t border-border" />
          </div>

          {/* ── Right — properties ──────────────────────────────────────────── */}
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
            </div>

            {/* Details */}
            <div className="px-4 pt-3 pb-4 border-t border-border/60 space-y-2.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Details
              </p>
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
  )
}
