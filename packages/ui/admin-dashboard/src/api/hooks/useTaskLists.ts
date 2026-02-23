import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"
import { issueKeys } from "./useIssues"

export interface TaskList {
  id: string
  name: string
  description?: string | null
  project_id: string
  position: number
  created_at: string
  updated_at: string
}

export const taskListKeys = {
  byProject: (projectId: string) => ["task-lists", "project", projectId] as const,
}

export function useTaskLists(projectId?: string) {
  return useQuery({
    queryKey: projectId ? taskListKeys.byProject(projectId) : ["task-lists"],
    queryFn: () =>
      api.get<{ task_lists: TaskList[]; count: number }>(`/admin/projects/${projectId}/task-lists`),
    select: (data) => data.task_lists,
    enabled: !!projectId,
  })
}

export function useCreateTaskList(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<{ task_list: TaskList }>(`/admin/projects/${projectId}/task-lists`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskListKeys.byProject(projectId) })
    },
  })
}

export function useUpdateTaskList(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
      api.put<{ task_list: TaskList }>(`/admin/task-lists/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskListKeys.byProject(projectId) })
    },
  })
}

export function useDeleteTaskList(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/task-lists/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskListKeys.byProject(projectId) })
      // Issues have their task_list_id nulled on the server; refresh so the
      // frontend grouping reflects the updated values immediately.
      qc.invalidateQueries({ queryKey: issueKeys.byProject(projectId) })
    },
  })
}
