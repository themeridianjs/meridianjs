import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { format } from "date-fns"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useIssues, issueKeys } from "@/api/hooks/useIssues"
import type { Issue } from "@/api/hooks/useIssues"
import { useProjectStatuses } from "@/api/hooks/useProjectStatuses"
import { useSprints } from "@/api/hooks/useSprints"
import { api } from "@/api/client"
import {
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttHeader,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureItem,
  GanttToday,
  GanttMarker,
} from "@/components/kibo-ui/gantt"
import type { GanttFeature, Range } from "@/components/kibo-ui/gantt"
import { Button } from "@/components/ui/button"
import { IssueDetail } from "@/components/issues/IssueDetail"
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog"
import { Plus } from "lucide-react"
import { toast } from "sonner"

function issueToFeature(issue: Issue, statusColor: string): GanttFeature {
  const startAt = issue.start_date
    ? new Date(issue.start_date)
    : new Date(issue.due_date!)
  const endAt = issue.due_date ? new Date(issue.due_date) : startAt

  return {
    id: issue.id,
    name: `${issue.identifier} ${issue.title}`,
    startAt,
    endAt,
    status: {
      id: issue.status,
      name: issue.status,
      color: statusColor,
    },
  }
}

export function ProjectTimelinePage() {
  const { projectKey } = useParams<{ projectKey: string }>()
  const qc = useQueryClient()

  const [range, setRange] = useState<Range>("monthly")
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const ganttWrapRef = useRef<HTMLDivElement>(null)

  // Scroll to today whenever the range changes (or on first mount).
  // The GanttProvider's own init effect centers on scrollWidth/2 (≈ June of current year).
  // We override that with a RAF so our effect runs after the gantt's effects commit.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const ganttEl = ganttWrapRef.current?.querySelector(".gantt") as HTMLDivElement | null
      if (!ganttEl) return

      const today = new Date()
      const startYear = today.getFullYear() - 1  // timeline begins Jan 1 of prev year
      const SIDEBAR_WIDTH = 300

      let todayPx: number
      if (range === "daily") {
        // each column = 1 day, 50px wide
        const startDate = new Date(startYear, 0, 1)
        const diffDays = Math.floor((today.getTime() - startDate.getTime()) / 86_400_000)
        todayPx = diffDays * 50
      } else {
        // "monthly" = 150px/month, "quarterly" = 100px/month
        const colW = range === "monthly" ? 150 : 100
        const monthsFromStart = (today.getFullYear() - startYear) * 12 + today.getMonth()
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
        todayPx = monthsFromStart * colW + ((today.getDate() - 1) / daysInMonth) * colW
      }

      const visibleWidth = ganttEl.clientWidth - SIDEBAR_WIDTH
      ganttEl.scrollLeft = Math.max(0, todayPx - visibleWidth / 2)
    })
    return () => cancelAnimationFrame(raf)
  }, [range])

  const { data: project } = useProjectByKey(projectKey ?? "")
  const projectId = project?.id ?? ""

  const { data: issues = [] } = useIssues(projectId || undefined)
  const { data: statuses = [] } = useProjectStatuses(projectId || undefined)
  const { data: sprints = [] } = useSprints(projectId || undefined)

  const updateMutation = useMutation({
    mutationFn: ({ id, start_date, due_date }: { id: string; start_date: string | null; due_date: string | null }) =>
      api.put<{ issue: Issue }>(`/admin/issues/${id}`, { start_date, due_date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: issueKeys.byProject(projectId) })
    },
    onError: () => toast.error("Failed to update issue dates"),
  })

  const statusColorMap = Object.fromEntries(statuses.map((s) => [s.key, s.color]))

  // Split issues into scheduled (have due_date) and unscheduled (no due_date)
  const scheduledIssues = issues.filter((i) => i.due_date)
  const unscheduledIssues = issues.filter((i) => !i.due_date)

  // Group scheduled issues by sprint
  const sprintMap: Record<string, Issue[]> = {}
  const noSprintIssues: Issue[] = []

  for (const issue of scheduledIssues) {
    if (issue.sprint_id) {
      if (!sprintMap[issue.sprint_id]) sprintMap[issue.sprint_id] = []
      sprintMap[issue.sprint_id].push(issue)
    } else {
      noSprintIssues.push(issue)
    }
  }

  const handleMove = (id: string, startAt: Date, endAt: Date | null) => {
    updateMutation.mutate({
      id,
      start_date: format(startAt, "yyyy-MM-dd"),
      due_date: endAt ? format(endAt, "yyyy-MM-dd") : null,
    })
  }

  const handleSelectIssue = (id: string) => {
    const issue = issues.find((i) => i.id === id) ?? null
    setSelectedIssue(issue)
  }

  if (!projectKey) return null

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          {(["daily", "monthly", "quarterly"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${
                range === r
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Issue
        </Button>
      </div>

      {/* Gantt chart fills remaining height */}
      <div ref={ganttWrapRef} className="flex-1 min-h-0 overflow-hidden">
        <GanttProvider range={range} zoom={100} className="h-full bg-white dark:bg-zinc-950">
          <GanttSidebar>
            {/* Sprint groups */}
            {sprints.map((sprint) => {
              const sprintIssues = sprintMap[sprint.id] ?? []
              return (
                <GanttSidebarGroup key={sprint.id} name={sprint.name}>
                  {sprintIssues.map((issue) => (
                    <GanttSidebarItem
                      key={issue.id}
                      feature={issueToFeature(issue, statusColorMap[issue.status] ?? "#94a3b8")}
                      onSelectItem={handleSelectIssue}
                    />
                  ))}
                </GanttSidebarGroup>
              )
            })}

            {/* No sprint group */}
            {noSprintIssues.length > 0 && (
              <GanttSidebarGroup name="No Sprint">
                {noSprintIssues.map((issue) => (
                  <GanttSidebarItem
                    key={issue.id}
                    feature={issueToFeature(issue, statusColorMap[issue.status] ?? "#94a3b8")}
                    onSelectItem={handleSelectIssue}
                  />
                ))}
              </GanttSidebarGroup>
            )}

            {/* Unscheduled */}
            {unscheduledIssues.length > 0 && (
              <GanttSidebarGroup name="Unscheduled">
                {unscheduledIssues.map((issue) => (
                  <GanttSidebarItem
                    key={issue.id}
                    feature={{
                      id: issue.id,
                      name: `${issue.identifier} ${issue.title}`,
                      startAt: new Date(),
                      endAt: new Date(),
                      status: {
                        id: issue.status,
                        name: issue.status,
                        color: statusColorMap[issue.status] ?? "#94a3b8",
                      },
                    }}
                    onSelectItem={handleSelectIssue}
                  />
                ))}
              </GanttSidebarGroup>
            )}
          </GanttSidebar>

          <GanttTimeline>
            <GanttHeader />
            <GanttFeatureList>
              {/* One GanttFeatureItem per issue — aligns 1:1 with sidebar items */}
              {sprints.map((sprint) => {
                const sprintIssues = sprintMap[sprint.id] ?? []
                return (
                  <GanttFeatureListGroup key={sprint.id}>
                    {sprintIssues.map((issue) => (
                      <div key={issue.id} className="flex">
                        <GanttFeatureItem
                          onMove={handleMove}
                          {...issueToFeature(issue, statusColorMap[issue.status] ?? "#94a3b8")}
                        />
                      </div>
                    ))}
                  </GanttFeatureListGroup>
                )
              })}

              {noSprintIssues.length > 0 && (
                <GanttFeatureListGroup>
                  {noSprintIssues.map((issue) => (
                    <div key={issue.id} className="flex">
                      <GanttFeatureItem
                        onMove={handleMove}
                        {...issueToFeature(issue, statusColorMap[issue.status] ?? "#94a3b8")}
                      />
                    </div>
                  ))}
                </GanttFeatureListGroup>
              )}

              {/* Unscheduled — sidebar entries only; empty rows keep alignment */}
              {unscheduledIssues.length > 0 && (
                <GanttFeatureListGroup>
                  {unscheduledIssues.map((issue) => (
                    <div
                      key={issue.id}
                      style={{ height: "var(--gantt-row-height)" }}
                    />
                  ))}
                </GanttFeatureListGroup>
              )}
            </GanttFeatureList>

            {/* Sprint end markers */}
            {sprints
              .filter((s) => s.end_date)
              .map((sprint) => (
                <GanttMarker
                  key={sprint.id}
                  id={sprint.id}
                  date={new Date(sprint.end_date!)}
                  label={`${sprint.name} end`}
                />
              ))}

            <GanttToday />
          </GanttTimeline>
        </GanttProvider>
      </div>

      {/* Issue detail drawer */}
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
