import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
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
  recurrence_frequency?: "weekly" | "monthly" | null
  recurrence_end_date?: string | null
  next_occurrence_date?: string | null
  recurrence_source_id?: string | null
  child_count?: number
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
  recurrence_frequency?: "weekly" | "monthly"
  recurrence_end_date?: string
  mentioned_user_ids?: string[]
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
  recurrence_frequency?: "weekly" | "monthly" | null
  recurrence_end_date?: string | null
  next_occurrence_date?: string | null
  mentioned_user_ids?: string[]
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

export interface BoardFilters {
  priority?: string[]
  assignee_id?: string
  type?: string[]
  status?: string[]
}

export const issueKeys = {
  all: ["issues"] as const,
  byProject: (projectId: string, filters?: BoardFilters) =>
    [...issueKeys.all, "project", projectId, ...(filters ? [filters] : [])] as const,
  paginated: (params: PaginatedIssuesParams) =>
    [...issueKeys.all, "paginated", params] as const,
  related: (issueId: string) => [...issueKeys.all, issueId, "related"] as const,
  detail: (id: string) => [...issueKeys.all, id] as const,
  comments: (issueId: string) => [...issueKeys.all, issueId, "comments"] as const,
  activities: (issueId: string) => [...issueKeys.all, issueId, "activities"] as const,
}

export interface PaginatedIssuesParams {
  project_id: string
  page?: number
  pageSize?: number
  search?: string
  status?: string
  priority?: string
  sprint_id?: string
  task_list_id?: string
  assignee_id?: string
  sort_by?: string
  sort_order?: "asc" | "desc"
  parent_id?: string
}

export interface PaginatedIssuesResponse {
  issues: Issue[]
  count: number
  limit: number
  offset: number
}

export interface IssueRelatedResponse {
  parent: Issue | null
  children: Issue[]
  depth: number
}

export function useIssues(projectId?: string, filters?: BoardFilters) {
  return useQuery({
    queryKey: projectId ? issueKeys.byProject(projectId, filters) : issueKeys.all,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (projectId) {
        params.set("project_id", projectId)
        params.set("limit", "1000")
      }
      if (filters?.priority?.length) params.set("priority", filters.priority.join(","))
      if (filters?.assignee_id) params.set("assignee_id", filters.assignee_id)
      if (filters?.type?.length) params.set("type", filters.type.join(","))
      if (filters?.status?.length) params.set("status", filters.status.join(","))

      const first = await api.get<IssuesResponse>(`/admin/issues?${params}`)
      if (first.count <= first.issues.length) return first

      // Fetch remaining pages in parallel
      const pageSize = first.issues.length
      const remaining = first.count - pageSize
      const pages = Math.ceil(remaining / pageSize)
      const fetches = Array.from({ length: pages }, (_, i) => {
        const p = new URLSearchParams(params)
        p.set("offset", String(pageSize * (i + 1)))
        return api.get<IssuesResponse>(`/admin/issues?${p}`)
      })
      const results = await Promise.all(fetches)
      const allIssues = first.issues.concat(...results.map((r) => r.issues))
      return { issues: allIssues, count: first.count } as IssuesResponse
    },
    select: (data) => data.issues,
    enabled: !!projectId,
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

export function usePaginatedIssues(params: PaginatedIssuesParams) {
  const { project_id, page = 1, pageSize = 50, search, status, priority, sprint_id, task_list_id, assignee_id, sort_by, sort_order, parent_id } = params
  return useQuery({
    queryKey: issueKeys.paginated(params),
    queryFn: async () => {
      const qs = new URLSearchParams()
      qs.set("project_id", project_id)
      qs.set("limit", String(pageSize))
      qs.set("offset", String((page - 1) * pageSize))
      if (search) qs.set("search", search)
      if (status) qs.set("status", status)
      if (priority) qs.set("priority", priority)
      if (sprint_id) qs.set("sprint_id", sprint_id)
      if (task_list_id) qs.set("task_list_id", task_list_id)
      if (assignee_id) qs.set("assignee_id", assignee_id)
      if (sort_by) qs.set("sort_by", sort_by)
      if (sort_order) qs.set("sort_order", sort_order)
      if (parent_id) qs.set("parent_id", parent_id)
      return api.get<PaginatedIssuesResponse>(`/admin/issues?${qs}`)
    },
    placeholderData: keepPreviousData,
    enabled: !!project_id,
  })
}

export function useIssueRelated(issueId: string) {
  return useQuery({
    queryKey: issueKeys.related(issueId),
    queryFn: () => api.get<IssueRelatedResponse>(`/admin/issues/${issueId}/related`),
    enabled: !!issueId,
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
      qc.invalidateQueries({ queryKey: ["issues", "paginated"] })
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
      qc.invalidateQueries({ queryKey: ["issues", "paginated"] })
      qc.invalidateQueries({ queryKey: issueKeys.related(id) })
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
    mutationFn: ({ body, metadata }: { body: string; metadata?: { mentioned_user_ids?: string[] } }) =>
      api.post<{ comment: Comment }>(`/admin/issues/${issueId}/comments`, { body, metadata }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: issueKeys.comments(issueId) })
    },
  })
}
