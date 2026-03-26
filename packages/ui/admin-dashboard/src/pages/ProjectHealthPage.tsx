import { useState, useMemo } from "react"
import { useParams } from "react-router-dom"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RichTextEditor, RichTextContent } from "@/components/ui/rich-text-editor"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AssigneeSelector } from "@/components/issues/AssigneeSelector"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useProjectAccess } from "@/api/hooks/useProjectAccess"
import { type MentionItem } from "@/components/ui/rich-text-editor"
import {
  useProjectHealthUpdates,
  useCreateProjectHealthUpdate,
  useUpdateProjectHealthUpdate,
  useDeleteProjectHealthUpdate,
  useSendHealthReport,
  type ProjectHealthUpdate,
} from "@/api/hooks/useProjectHealth"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Send, Link, ExternalLink } from "lucide-react"

type HealthStatus = ProjectHealthUpdate["health"]

const HEALTH_CONFIG: Record<HealthStatus, { label: string; dotCls: string; badgeCls: string; accentBg: string; stroke: string; fill: string }> = {
  on_track: {
    label: "On track",
    dotCls: "bg-emerald-500",
    badgeCls: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800",
    accentBg: "bg-emerald-500",
    stroke: "#10b981",
    fill: "#d1fae5",
  },
  delayed: {
    label: "Delayed",
    dotCls: "bg-orange-500",
    badgeCls: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/40 dark:border-orange-800",
    accentBg: "bg-orange-500",
    stroke: "#f97316",
    fill: "#ffedd5",
  },
  on_hold: {
    label: "On hold",
    dotCls: "bg-amber-400",
    badgeCls: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800",
    accentBg: "bg-amber-400",
    stroke: "#fbbf24",
    fill: "#fef9c3",
  },
  completed: {
    label: "Completed",
    dotCls: "bg-indigo-500",
    badgeCls: "text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-800",
    accentBg: "bg-indigo-500",
    stroke: "#6366f1",
    fill: "#e0e7ff",
  },
}

const HEALTH_LEVEL: Record<HealthStatus, number> = {
  delayed: 1,
  on_hold: 2,
  on_track: 3,
  completed: 4,
}

const HEALTH_LEVEL_LABEL: Record<number, string> = {
  1: "Delayed",
  2: "On hold",
  3: "On track",
  4: "Completed",
}

function HealthBadge({ health, className }: { health: HealthStatus; className?: string }) {
  const cfg = HEALTH_CONFIG[health]
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0",
      cfg.badgeCls,
      className,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dotCls)} />
      {cfg.label}
    </span>
  )
}

function StatusHistoryGraph({
  updates,
  onSelect,
}: {
  updates: ProjectHealthUpdate[]
  onSelect: (id: string) => void
}) {
  const latest = updates[0]
  const latestCfg = HEALTH_CONFIG[latest.health]

  const data = useMemo(() =>
    // updates arrive newest-first; reverse so graph reads left (oldest) → right (newest)
    [...updates].reverse().map((u) => {
      const effectiveDate = u.report_date ?? u.created_at
      return {
        id: u.id,
        date: effectiveDate,
        dateLabel: format(parseISO(effectiveDate), "d MMM yy"),
        level: HEALTH_LEVEL[u.health],
        health: u.health,
        title: u.title ?? "Untitled",
      }
    }),
    [updates],
  )

  const dateRange = data.length >= 2
    ? `${format(parseISO(data[0].date), "MMM yyyy")} – ${format(parseISO(data[data.length - 1].date), "MMM yyyy")}`
    : null

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload as typeof data[0]
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2.5 text-sm min-w-[180px]">
        <p className="text-xs text-muted-foreground mb-1.5">{d.dateLabel}</p>
        <HealthBadge health={d.health} />
        <p className="text-xs font-medium mt-1.5 text-foreground max-w-[220px] truncate">{d.title}</p>
        <p className="text-xs text-muted-foreground mt-2">Click to view report →</p>
      </div>
    )
  }

  const handleChartClick = (chartData: any) => {
    const id = chartData?.activePayload?.[0]?.payload?.id
    if (id) onSelect(id)
  }

  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Status History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Health status changes over time. Click a point to read the full report.
        </p>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Current</span>
          <HealthBadge health={latest.health} />
        </div>
        <Separator orientation="vertical" className="h-4 shrink-0" />
        <span className="text-xs text-muted-foreground">
          {updates.length} update{updates.length !== 1 ? "s" : ""}
        </span>
        {dateRange && (
          <>
            <Separator orientation="vertical" className="h-4 shrink-0" />
            <span className="text-xs text-muted-foreground">{dateRange}</span>
          </>
        )}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data}
            margin={{ top: 16, right: 16, bottom: 8, left: 0 }}
            onClick={handleChartClick}
            style={{ cursor: "pointer" }}
          >
            <defs>
              <linearGradient id="healthAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={latestCfg.stroke} stopOpacity={0.18} />
                <stop offset="95%" stopColor={latestCfg.stroke} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-border"
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: "currentColor", className: "text-muted-foreground" }}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              domain={[0.5, 4.5]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={(v) => HEALTH_LEVEL_LABEL[v] ?? ""}
              tick={{ fontSize: 10, fill: "currentColor", className: "text-muted-foreground" }}
              tickLine={false}
              axisLine={false}
              width={68}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: latestCfg.stroke, strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="stepAfter"
              dataKey="level"
              stroke={latestCfg.stroke}
              strokeWidth={2}
              fill="url(#healthAreaGradient)"
              dot={{ r: 4, fill: latestCfg.stroke, stroke: "white", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: latestCfg.stroke, stroke: "white", strokeWidth: 2, style: { cursor: "pointer" } }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function ProjectHealthPage() {
  const { workspace: workspaceSlug, projectKey } = useParams<{ workspace: string; projectKey: string }>()

  const { data: project } = useProjectByKey(projectKey ?? "")
  const { data: projectAccess } = useProjectAccess(project?.id ?? "")

  const { data: updates = [], isLoading } = useProjectHealthUpdates(project?.id)
  const createUpdate = useCreateProjectHealthUpdate(project?.id ?? "")
  const updateUpdate = useUpdateProjectHealthUpdate(project?.id ?? "")
  const deleteUpdate = useDeleteProjectHealthUpdate(project?.id ?? "")
  const sendReport = useSendHealthReport(project?.id ?? "")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null)

  // Form state
  const [health, setHealth] = useState<HealthStatus>("on_track")
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [collaborators, setCollaborators] = useState<string[]>([])
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10))

  // Build mention list + collaborator user list from project members
  const projectMembers = useMemo(() => {
    if (!projectAccess?.members) return []
    return projectAccess.members
      .filter((m: any) => m.user)
      .map((m: any) => {
        const u = m.user!
        return {
          id: u.id,
          email: u.email,
          first_name: u.first_name ?? "",
          last_name: u.last_name ?? "",
        }
      })
  }, [projectAccess])

  const mentionUsers = useMemo<MentionItem[]>(() =>
    projectMembers.map((u) => ({
      id: u.id,
      label: `${u.first_name} ${u.last_name}`.trim() || u.email,
      email: u.email,
    })),
    [projectMembers])

  // Sort by report_date if set, otherwise fall back to created_at — newest first
  const sortedUpdates = useMemo(() =>
    [...updates].sort((a, b) => {
      const da = a.report_date ?? a.created_at
      const db = b.report_date ?? b.created_at
      return db.localeCompare(da)
    }),
    [updates],
  )

  const selectedUpdate = sortedUpdates.find((u) => u.id === selectedId)
  const hasEnoughForGraph = !isLoading && sortedUpdates.length >= 2
  const showGraph = !selectedId && !showForm && hasEnoughForGraph
  const autoSelectLatest = !selectedId && !showForm && !isLoading && !hasEnoughForGraph && sortedUpdates.length === 1
  const showingForm = showForm || (sortedUpdates.length === 0 && !isLoading)
  const detailUpdate = selectedUpdate ?? (autoSelectLatest ? sortedUpdates[0] : null)

  const handleSubmit = async () => {
    if (!project) return
    if (!title.trim()) { toast.error("Please add a title"); return }
    try {
      if (isEditing && selectedId) {
        await updateUpdate.mutateAsync({ updateId: selectedId, health, title: title.trim(), summary: summary || null, report_date: reportDate || null, collaborators })
        toast.success("Update saved")
        setIsEditing(false)
        setShowForm(false)
      } else {
        const result = await createUpdate.mutateAsync({ health, title: title.trim(), summary: summary || null, report_date: reportDate || null, collaborators })
        toast.success("Status update posted")
        setTitle("")
        setSummary("")
        setHealth("on_track")
        setReportDate(new Date().toISOString().slice(0, 10))
        setCollaborators([])
        setShowForm(false)
        setSelectedId(result.update.id)
      }
    } catch {
      toast.error(isEditing ? "Failed to save update" : "Failed to post status update")
    }
  }

  const handleNewUpdate = () => {
    setIsEditing(false)
    setTitle("")
    setSummary("")
    setHealth("on_track")
    setReportDate(new Date().toISOString().slice(0, 10))
    setCollaborators([])
    setSelectedId(null)
    setShowForm(true)
  }

  const handleEdit = (update: ProjectHealthUpdate) => {
    setSelectedId(update.id)
    setHealth(update.health)
    setTitle(update.title ?? "")
    setSummary(update.summary ?? "")
    setReportDate(update.report_date ?? new Date().toISOString().slice(0, 10))
    setCollaborators(update.collaborators ?? [])
    setIsEditing(true)
    setShowForm(true)
  }

  const handleDelete = (update: ProjectHealthUpdate) => {
    setConfirmDeleteId(update.id)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    try {
      await deleteUpdate.mutateAsync(confirmDeleteId)
      toast.success("Update deleted")
      const remaining = sortedUpdates.filter((u) => u.id !== confirmDeleteId)
      setSelectedId(remaining.length > 0 ? remaining[0].id : null)
      setShowForm(false)
    } catch {
      toast.error("Failed to delete update")
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setShowForm(false)
    setCollaborators([])
    // Only auto-select latest when there isn't enough for a graph
    if (sortedUpdates.length === 1) setSelectedId(sortedUpdates[0].id)
    else setSelectedId(null)
  }

  const handleSend = (update: ProjectHealthUpdate) => {
    if (!update.collaborators?.length) {
      toast.error("No collaborators added to this update")
      return
    }
    setConfirmSendId(update.id)
  }

  const confirmSend = async () => {
    if (!confirmSendId) return
    try {
      const result = await sendReport.mutateAsync(confirmSendId)
      toast.success(result.sent === 0
        ? "No recipients to notify"
        : `Report sent to ${result.sent} collaborator${result.sent === 1 ? "" : "s"}`)
    } catch {
      toast.error("Failed to send report")
    } finally {
      setConfirmSendId(null)
    }
  }

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-card">

      {/* ── Left panel: timeline ── */}
      <div className="w-[20rem] shrink-0 border-r border-border flex flex-col bg-muted/20">

        {/* Header */}
        <div className="px-4 py-3.5 flex items-center justify-between shrink-0 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</span>
          <Button
            variant="default"
            size="sm"
            onClick={handleNewUpdate}
            className="flex items-center gap-1 text-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Update
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {isLoading && (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">Loading…</div>
          )}
          {!isLoading && sortedUpdates.length === 0 && (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground leading-relaxed">
              No status updates yet.<br />Post your first update.
            </div>
          )}

          <div className="py-1 divide-y divide-border">
            {sortedUpdates.map((update, i) => {
              const isSelected = selectedId === update.id || (!selectedId && !showingForm && !showGraph && i === 0)
              const effectiveDateStr = update.report_date ?? update.created_at
              const date = parseISO(effectiveDateStr)
              const cfg = HEALTH_CONFIG[update.health]

              return (
                <button
                  key={update.id}
                  onClick={() => { setSelectedId(update.id); setShowForm(false) }}
                  className={cn(
                    "w-full text-left px-3 py-3 transition-colors focus:outline-none group relative",
                    isSelected
                      ? "bg-white dark:bg-card shadow-[inset_2px_0_0_0] shadow-foreground/20"
                      : "hover:bg-white dark:hover:bg-card",
                  )}
                >
                  {/* Status accent line */}
                  <span className={cn(
                    "absolute left-0 top-0 h-full bottom-3 w-0.5 rounded-full transition-opacity",
                    cfg.accentBg,
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                  )} />

                  <div className="pl-2">
                    <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate flex-1 min-w-0">
                        {update.title}
                      </p>
                      <HealthBadge health={update.health} />
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-[11px] text-muted-foreground">
                        {format(date, "d MMM yyyy")}
                      </p>
                      <button
                        type="button"
                        title="Copy link"
                        onClick={(e) => {
                          e.stopPropagation()
                          const url = `${window.location.origin}/${workspaceSlug}/projects/${projectKey}/health/${update.id}`
                          navigator.clipboard.writeText(url).then(() => {
                            toast.success("Link copied")
                          })
                        }}
                        className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Link className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        title="Open in new tab"
                        onClick={(e) => {
                          e.stopPropagation()
                          const url = `${window.location.origin}/${workspaceSlug}/projects/${projectKey}/health/${update.id}`
                          window.open(url, "_blank", "noopener,noreferrer")
                        }}
                        className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right panel: detail or form ── */}
      <div className="flex-1 overflow-auto">

        {showGraph ? (
          <StatusHistoryGraph
            updates={sortedUpdates}
            onSelect={(id) => { setSelectedId(id); setShowForm(false) }}
          />
        ) : showingForm ? (
          /* ── New update form ── */
          <div className="mx-auto px-8 py-10">

            {/* Page title */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold tracking-tight">
                {isEditing ? "Edit status update" : "New status update"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Share the current health of this project with your team.
              </p>
            </div>

            <div className="space-y-6">

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Q1 milestone reached on schedule"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Status <span className="text-destructive">*</span>
                </label>
                <Select value={health} onValueChange={(v) => setHealth(v as HealthStatus)}>
                  <SelectTrigger className="w-48">
                    <SelectValue>
                      <HealthBadge health={health} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(HEALTH_CONFIG) as HealthStatus[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        <HealthBadge health={key} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Report date */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Report date</label>
                <p className="text-xs text-muted-foreground">
                  The date this report represents — can be set to a future period.
                </p>
                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-48 text-sm"
                />
              </div>

              {/* Collaborators */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Collaborators</label>
                <p className="text-xs text-muted-foreground">
                  People who will receive this report when you send it.
                </p>
                <AssigneeSelector
                  value={collaborators}
                  onChange={setCollaborators}
                  users={projectMembers}
                  emptyLabel="Add collaborators"
                />
              </div>

              <Separator />

              {/* Summary */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Summary</label>
                <p className="text-xs text-muted-foreground">
                  Describe the current state. Use @ to mention team members.
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <RichTextEditor
                    content={summary}
                    onChange={setSummary}
                    placeholder="How's this project going? What blockers exist?"
                    editorClassName="min-h-[220px] px-4 py-3"
                    users={mentionUsers}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={handleSubmit} disabled={createUpdate.isPending || updateUpdate.isPending}>
                  {isEditing
                    ? (updateUpdate.isPending ? "Saving…" : "Save changes")
                    : (createUpdate.isPending ? "Posting…" : "Post update")}
                </Button>
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>

        ) : detailUpdate ? (
          /* ── Update detail view ── */
          <div className="mx-auto px-8 py-10">

            {/* Status accent bar */}
            <div className={cn("h-1 w-16 rounded-full mb-6", HEALTH_CONFIG[detailUpdate.health].accentBg)} />

            {/* Header row */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-xl font-semibold tracking-tight leading-snug">
                {detailUpdate.title}
              </h2>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon" variant="ghost" className="h-8 w-8"
                  title="Edit" onClick={() => handleEdit(detailUpdate)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon" variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Delete" onClick={() => handleDelete(detailUpdate)}
                  disabled={deleteUpdate.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon" variant="ghost"
                  className="h-8 w-8"
                  title="Send report to collaborators"
                  onClick={() => handleSend(detailUpdate)}
                  disabled={sendReport.isPending || !detailUpdate.collaborators?.length}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mb-4">
              <HealthBadge health={detailUpdate.health} />
              <span className="text-sm text-muted-foreground">
                {detailUpdate.report_date
                  ? format(parseISO(detailUpdate.report_date), "d MMM yyyy")
                  : format(parseISO(detailUpdate.created_at), "d MMM yyyy 'at' HH:mm")}
              </span>
              {detailUpdate.report_date && (
                <span className="text-xs text-muted-foreground/60">
                  posted {format(parseISO(detailUpdate.created_at), "d MMM")}
                </span>
              )}
            </div>

            {/* Collaborators row */}
            {detailUpdate.collaborators?.length > 0 && (() => {
              const collabUsers = projectMembers.filter((m) => detailUpdate.collaborators.includes(m.id))
              return (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-muted-foreground shrink-0">Collaborators</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {collabUsers.map((u) => {
                      const name = `${u.first_name} ${u.last_name}`.trim() || u.email
                      const initials = ((u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "")).toUpperCase() || u.email[0].toUpperCase()
                      return (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5"
                          title={u.email}
                        >
                          <span className="inline-flex h-4 w-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 items-center justify-center text-[9px] font-medium shrink-0">
                            {initials}
                          </span>
                          {name}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            <Separator className="mb-6" />

            {/* Summary content */}
            {detailUpdate.summary ? (
              <RichTextContent html={detailUpdate.summary} />
            ) : (
              <p className="text-sm text-muted-foreground italic">No summary was provided for this update.</p>
            )}
          </div>

        ) : null}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete status update"
        description="This status update will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteUpdate.isPending}
      />

      <ConfirmDialog
        open={!!confirmSendId}
        onClose={() => setConfirmSendId(null)}
        onConfirm={confirmSend}
        title="Send health report"
        description="This will email the health report to all collaborators on this update."
        confirmLabel="Send"
        loading={sendReport.isPending}
      />
    </div>
  )
}
