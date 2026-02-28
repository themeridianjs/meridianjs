import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface Issue {
  id: string
  identifier: string
  title: string
  description?: string
  status: string
  priority: string
  type: string
  project_id: string
  workspace_id: string
  assignee_ids?: string[]
  sprint_id?: string | null
  task_list_id?: string | null
  parent_id?: string | null
  start_date?: string | null
  due_date?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  body: string
  author_id: string
  issue_id: string
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface IssuesResponse {
  issues: Issue[]
  count: number
}

interface CreateIssueInput {
  title: string
  description?: string
  status?: string
  priority?: string
  type?: string
  project_id: string
  workspace_id: string
  assignee_ids?: string[]
  sprint_id?: string | null
  task_list_id?: string | null
  parent_id?: string | null
  start_date?: string | null
  due_date?: string | null
  metadata?: Record<string, unknown> | null
}

interface UpdateIssueInput {
  title?: string
  description?: string
  status?: string
  priority?: string
  type?: string
  assignee_ids?: string[]
  sprint_id?: string | null
  task_list_id?: string | null
  parent_id?: string | null
  start_date?: string | null
  due_date?: string | null
  metadata?: Record<string, unknown> | null
}

export interface Activity {
  id: string
  entity_type: string
  entity_id: string
  actor_id: string
  action: string
  changes: Record<string, { from: unknown; to: unknown }> | null
  workspace_id: string
  created_at: string
}

export const issueKeys = {
  all: ["issues"] as const,
  byProject: (projectId: string) => [...issueKeys.all, "project", projectId] as const,
  detail: (id: string) => [...issueKeys.all, id] as const,
  comments: (issueId: string) => [...issueKeys.all, issueId, "comments"] as const,
  activities: (issueId: string) => [...issueKeys.all, issueId, "activities"] as const,
}

export function useIssues(projectId?: string) {
  return useQuery({
    queryKey: projectId ? issueKeys.byProject(projectId) : issueKeys.all,
    queryFn: () => {
      const url = projectId
        ? `/admin/issues?project_id=${projectId}`
        : "/admin/issues"
      return api.get<IssuesResponse>(url)
    },
    select: (data) => data.issues,
  })
}

export function useIssue(id: string) {
  return useQuery({
    queryKey: issueKeys.detail(id),
    queryFn: () => api.get<{ issue: Issue }>(`/admin/issues/${id}`),
    select: (data) => data.issue,
    enabled: !!id,
  })
}

export function useIssueComments(issueId: string) {
  return useQuery({
    queryKey: issueKeys.comments(issueId),
    queryFn: () =>
      api.get<{ comments: Comment[] }>(`/admin/issues/${issueId}/comments`),
    select: (data) => data.comments,
    enabled: !!issueId,
  })
}

export function useCreateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIssueInput) =>
      api.post<{ issue: Issue }>("/admin/issues", data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: issueKeys.byProject(variables.project_id) })
    },
  })
}

export function useUpdateIssue(id: string, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateIssueInput) =>
      api.put<{ issue: Issue }>(`/admin/issues/${id}`, data),

    // Optimistically patch the list cache so the cell updates instantly and
    // the refetch on settle doesn't cause a visible flash or row reorder.
    onMutate: async (newData) => {
      await qc.cancelQueries({ queryKey: issueKeys.byProject(projectId) })
      const previous = qc.getQueryData<IssuesResponse>(issueKeys.byProject(projectId))
      qc.setQueryData<IssuesResponse>(issueKeys.byProject(projectId), (old) => {
        if (!old) return old
        return {
          ...old,
          issues: old.issues.map((issue) =>
            issue.id === id ? { ...issue, ...newData } : issue
          ),
        }
      })
      return { previous }
    },

    // Roll back on error
    onError: (_err, _vars, context: { previous?: IssuesResponse } | undefined) => {
      if (context?.previous) {
        qc.setQueryData<IssuesResponse>(issueKeys.byProject(projectId), context.previous)
      }
    },

    // Always reconcile with server after settle
    onSettled: () => {
      qc.invalidateQueries({ queryKey: issueKeys.byProject(projectId) })
      qc.invalidateQueries({ queryKey: issueKeys.detail(id) })
    },
  })
}

export function useIssueActivities(issueId: string) {
  return useQuery({
    queryKey: issueKeys.activities(issueId),
    queryFn: () => api.get<{ activities: Activity[] }>(`/admin/issues/${issueId}/activities`),
    select: (data) => data.activities,
    enabled: !!issueId,
  })
}

export function useCreateComment(issueId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      api.post<{ comment: Comment }>(`/admin/issues/${issueId}/comments`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: issueKeys.comments(issueId) })
    },
  })
}
