import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { api } from "../client"
import { buildQuery } from "@/lib/buildQuery"

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
  depends_on_ids?: string[] | null
  related_to_ids?: string[] | null
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
  depends_on_ids?: string[] | null
  related_to_ids?: string[] | null
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
  depends_on_ids?: string[] | null
  related_to_ids?: string[] | null
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
  relations: (issueId: string) => [...issueKeys.all, issueId, "relations"] as const,
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
      const baseParams = {
        project_id: projectId,
        limit: projectId ? 1000 : undefined,
        priority: filters?.priority?.join(","),
        assignee_id: filters?.assignee_id,
        type: filters?.type?.join(","),
        status: filters?.status?.join(","),
      }

      const first = await api.get<IssuesResponse>(`/admin/issues${buildQuery(baseParams)}`)
      if (first.count <= first.issues.length) return first

      // Fetch remaining pages in parallel.
      const pageSize = first.issues.length
      // Guard: an empty first page with a non-zero count would make pages
      // Infinity and throw a RangeError. Bail out with what we have.
      if (pageSize === 0) return first
      const remaining = first.count - pageSize
      // Cap total extra pages so a huge board can't fire hundreds of parallel
      // requests / blow up client memory. Beyond this, callers should paginate.
      const MAX_EXTRA_PAGES = 20
      const pages = Math.min(Math.ceil(remaining / pageSize), MAX_EXTRA_PAGES)
      const fetches = Array.from({ length: pages }, (_, i) =>
        api.get<IssuesResponse>(
          `/admin/issues${buildQuery({ ...baseParams, offset: pageSize * (i + 1) })}`
        )
      )
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
    queryFn: async () =>
      api.get<PaginatedIssuesResponse>(
        `/admin/issues${buildQuery({
          project_id,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          search,
          status,
          priority,
          sprint_id,
          task_list_id,
          assignee_id,
          sort_by,
          sort_order,
          parent_id,
        })}`
      ),
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

export interface IssueRelationsResponse {
  depends_on: Issue[]
  related_to: Issue[]
}

export function useIssueRelations(issueId: string) {
  return useQuery({
    queryKey: issueKeys.relations(issueId),
    queryFn: () => api.get<IssueRelationsResponse>(`/admin/issues/${issueId}/relations`),
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
    // Patch EVERY board variant for this project (the board key includes the
    // active filters, so a single no-filter key would miss the filtered board).
    onMutate: async (newData) => {
      const boardPrefix = ["issues", "project", projectId] as const
      await qc.cancelQueries({ queryKey: boardPrefix })
      const previous = qc.getQueriesData<IssuesResponse>({ queryKey: boardPrefix })
      qc.setQueriesData<IssuesResponse>({ queryKey: boardPrefix }, (old) => {
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

    // Roll back on error — restore each board variant snapshot.
    onError: (_err, _vars, context: { previous?: [readonly unknown[], IssuesResponse | undefined][] } | undefined) => {
      context?.previous?.forEach(([key, data]) => {
        qc.setQueryData(key, data)
      })
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
