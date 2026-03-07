import { useState, useMemo } from "react"
import { useParams, Navigate } from "react-router-dom"
import { useIsMobile } from "@/lib/hooks"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useIssues, type BoardFilters } from "@/api/hooks/useIssues"
import type { Issue } from "@/api/hooks/useIssues"
import { useProjectStatuses, useReorderProjectStatuses } from "@/api/hooks/useProjectStatuses"
import { useProjectAccess } from "@/api/hooks/useProjectAccess"
import { useUserMap } from "@/api/hooks/useUsers"
import { KanbanBoard } from "@/components/board/KanbanBoard"
import { BoardFilterBar } from "@/components/board/BoardFilterBar"
import { IssueDetail } from "@/components/issues/IssueDetail"
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus } from "lucide-react"
import { WidgetZone } from "@/components/WidgetZone"

export function ProjectBoardPage() {
  const { projectKey, workspace } = useParams<{ projectKey: string; workspace: string }>()
  const isMobile = useIsMobile()
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [filters, setFilters] = useState<BoardFilters>({})

  const { data: project } = useProjectByKey(projectKey ?? "")
  const projectId = project?.id ?? ""
  const { data: issues, isLoading: issuesLoading } = useIssues(projectId || undefined, filters)
  const { data: statuses, isLoading: statusesLoading } = useProjectStatuses(projectId || undefined)
  const { data: access } = useProjectAccess(projectId)
  const { data: userMap } = useUserMap()
  const reorderStatuses = useReorderProjectStatuses(projectId)

  const members = useMemo(() => {
    if (!access?.members || !userMap) return []
    return access.members
      .map((m) => {
        const info = userMap.get(m.user_id)
        if (!info) return null
        return { userId: m.user_id, name: info.name, initials: info.initials }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
  }, [access, userMap])

  if (isMobile && projectKey && workspace) {
    return <Navigate to={`/${workspace}/projects/${projectKey}/issues`} replace />
  }

  if (!projectKey) return null

  const isLoading = issuesLoading || statusesLoading || !project

  const handleColumnsReorder = (orderedIds: string[]) => {
    reorderStatuses.mutate(orderedIds)
  }

  return (
    <div className="flex flex-col h-full gap-0">
      <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-card">
        {/* Actions bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <BoardFilterBar
            statuses={statuses ?? []}
            members={members}
            filters={filters}
            onChange={setFilters}
          />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>

        <WidgetZone zone="project.board.before" props={{ projectId }} />

        {/* Board — only this area scrolls */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex gap-4 px-6 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="min-w-[260px]">
                  <Skeleton className="h-5 w-24 mb-3 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-[82px] w-full rounded-lg" />
                    <Skeleton className="h-[82px] w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <KanbanBoard
              issues={issues ?? []}
              projectId={projectId}
              statuses={statuses ?? []}
              onIssueClick={setSelectedIssue}
              onColumnsReorder={handleColumnsReorder}
              filters={filters}
            />
          )}
        </div>
      </div>

      <WidgetZone zone="project.board.after" props={{ projectId }} />

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
