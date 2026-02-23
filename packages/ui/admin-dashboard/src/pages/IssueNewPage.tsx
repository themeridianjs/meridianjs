import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useCreateIssue } from "@/api/hooks/useIssues"
import { useProject } from "@/api/hooks/useProjects"
import { useAuth } from "@/stores/auth"
import { useProjectStatuses } from "@/api/hooks/useProjectStatuses"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { ISSUE_STATUS_LABELS, ISSUE_PRIORITY_LABELS, ISSUE_TYPE_LABELS } from "@/lib/constants"
import {
  ChevronLeft,
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
  backlog:     <Circle className="h-3 w-3 text-zinc-400" />,
  todo:        <Circle className="h-3 w-3 text-zinc-500" strokeWidth={2.5} />,
  in_progress: <Clock className="h-3 w-3 text-indigo-500" />,
  in_review:   <Eye className="h-3 w-3 text-amber-500" />,
  done:        <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
  cancelled:   <XCircle className="h-3 w-3 text-zinc-400" />,
}

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  urgent: <Zap className="h-3 w-3 text-red-500" />,
  high:   <ArrowUp className="h-3 w-3 text-orange-500" />,
  medium: <Minus className="h-3 w-3 text-yellow-500" />,
  low:    <ArrowDown className="h-3 w-3 text-blue-400" />,
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  bug:     <Bug className="h-3 w-3 text-red-500" />,
  feature: <Sparkles className="h-3 w-3 text-purple-500" />,
  task:    <CheckSquare className="h-3 w-3 text-blue-500" />,
  chore:   <ArrowRight className="h-3 w-3 text-zinc-500" />,
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

export function IssueNewPage() {
  const { workspace, projectId } = useParams<{ workspace: string; projectId: string }>()
  const navigate = useNavigate()
  const { workspace: workspaceRef } = useAuth()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("backlog")
  const [priority, setPriority] = useState("medium")
  const [type, setType] = useState("task")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])

  const { data: project } = useProject(projectId ?? "")
  const createIssue = useCreateIssue()
  const { data: projectStatuses } = useProjectStatuses(projectId)

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

  if (!projectId) return null

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    createIssue.mutate(
      {
        title: title.trim(),
        description: description || undefined,
        status,
        priority,
        type,
        project_id: projectId,
        workspace_id: workspaceRef!.id,
        assignee_ids: assigneeIds.length > 0 ? assigneeIds : undefined,
      },
      {
        onSuccess: (data) => {
          toast.success("Issue created")
          navigate(`/${workspace}/projects/${projectId}/issues/${data.issue.id}`, { replace: true })
        },
        onError: (err) => toast.error((err as Error).message ?? "Failed to create issue"),
      }
    )
  }

  return (
    <div className="min-h-full bg-[hsl(60_5%_96%)] dark:bg-background">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 h-[57px] bg-white dark:bg-card border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-muted-foreground hover:text-foreground px-2"
          onClick={() => navigate(`/${workspace}/projects/${projectId}/issues`)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {project?.name ?? "Issues"}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/${workspace}/projects/${projectId}/issues`)}
          >
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim() || createIssue.isPending}
            className="px-4"
          >
            {createIssue.isPending ? "Creating…" : "Create issue"}
          </Button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="px-2 py-2">
        <div className="grid grid-cols-[1fr_256px] gap-5 items-start">

          {/* ── Left — title + editor ───────────────────────────────────────── */}
          <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {/* Title */}
            <div className="px-6 pt-6 pb-3">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault()
                }}
                placeholder="Issue title…"
                className={cn(
                  "w-full text-xl font-semibold leading-snug text-foreground",
                  "bg-transparent border-0 outline-none resize-none",
                  "placeholder:text-muted-foreground/40"
                )}
              />
            </div>

            {/* Editor label */}
            <div className="flex items-center gap-2 px-6 pb-2">
              <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                Description
              </span>
            </div>

            {/* WYSIWYG editor */}
            <RichTextEditor
              content=""
              onChange={setDescription}
              placeholder="Add steps to reproduce, acceptance criteria, or context…"
              className="border-t border-border/50 min-h-[320px]"
            />
          </div>

          {/* ── Right — properties ─────────────────────────────────────────── */}
          <div className="bg-white dark:bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Properties
              </p>
            </div>

            <div className="px-4 py-1">
              <PropertyRow label="Status">
                <IconSelect
                  value={status}
                  onValueChange={setStatus}
                  options={statusOptions}
                  icons={statusIcons}
                />
              </PropertyRow>

              <PropertyRow label="Priority">
                <IconSelect
                  value={priority}
                  onValueChange={setPriority}
                  options={ISSUE_PRIORITY_LABELS}
                  icons={PRIORITY_ICONS}
                />
              </PropertyRow>

              <PropertyRow label="Type">
                <IconSelect
                  value={type}
                  onValueChange={setType}
                  options={ISSUE_TYPE_LABELS}
                  icons={TYPE_ICONS}
                />
              </PropertyRow>

              <PropertyRow label="Assignees">
                <AssigneeSelector value={assigneeIds} onChange={setAssigneeIds} />
              </PropertyRow>
            </div>

            {/* Keyboard shortcut hint */}
            <div className="px-4 pt-2 pb-3 mt-1 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                Press <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">⌘ Enter</kbd> to submit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
