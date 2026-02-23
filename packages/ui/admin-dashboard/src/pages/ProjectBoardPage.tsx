import { useState } from "react"
import { useParams } from "react-router-dom"
import { useProject } from "@/api/hooks/useProjects"
import { useIssues } from "@/api/hooks/useIssues"
import type { Issue } from "@/api/hooks/useIssues"
import { KanbanBoard } from "@/components/board/KanbanBoard"
import { IssueDetail } from "@/components/issues/IssueDetail"
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus } from "lucide-react"

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: project } = useProject(projectId ?? "")
  const { data: issues, isLoading } = useIssues(projectId)

  if (!projectId) return null

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[hsl(60_5%_96%)] dark:bg-background shrink-0">
        <div className="flex items-center gap-2.5">
          {project && (
            <span className="text-xs font-mono text-muted-foreground bg-white dark:bg-card border border-border px-2 py-0.5 rounded">
              {project.identifier}
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>

      {/* Board */}
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
          onIssueClick={setSelectedIssue}
        />
      )}

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
