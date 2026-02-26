import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface AppRole {
  id: string
  name: string
  description: string | null
  is_system: boolean
  permissions: string[]
  created_at: string
  updated_at: string
}

interface RolesResponse {
  roles: AppRole[]
  count: number
}

const roleKeys = {
  all: ["roles"] as const,
  list: () => [...roleKeys.all, "list"] as const,
  detail: (id: string) => [...roleKeys.all, id] as const,
}

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.list(),
    queryFn: () => api.get<RolesResponse>("/admin/roles"),
    select: (data) => data.roles,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; description?: string; permissions: string[] }) =>
      api.post<{ role: AppRole }>("/admin/roles", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.list() })
    },
  })
}

export function useUpdateRole(roleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name?: string; description?: string; permissions?: string[] }) =>
      api.put<{ role: AppRole }>(`/admin/roles/${roleId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.list() })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => api.delete(`/admin/roles/${roleId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.list() })
    },
  })
}

export function useAssignUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, appRoleId }: { userId: string; appRoleId: string | null }) =>
      api.patch(`/admin/users/${userId}/role`, { app_role_id: appRoleId }),
    onSuccess: () => {
      // Invalidate all workspace member queries so the role dropdowns refresh
      qc.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

// Canonical list of all supported permissions, grouped by category
export const ALL_PERMISSIONS: { group: string; permissions: { key: string; label: string }[] }[] = [
  {
    group: "Members & Invitations",
    permissions: [
      { key: "member:invite", label: "Invite members" },
      { key: "member:remove", label: "Remove members" },
      { key: "member:update_role", label: "Change member roles" },
    ],
  },
  {
    group: "Workspaces",
    permissions: [
      { key: "workspace:create", label: "Create workspaces" },
      { key: "workspace:update", label: "Update workspace settings" },
      { key: "workspace:delete", label: "Delete workspaces" },
    ],
  },
  {
    group: "Projects",
    permissions: [
      { key: "project:create", label: "Create projects" },
      { key: "project:update", label: "Update project settings" },
      { key: "project:delete", label: "Delete projects" },
      { key: "project:archive", label: "Archive projects" },
      { key: "project:manage_access", label: "Manage project access" },
    ],
  },
  {
    group: "Issues",
    permissions: [
      { key: "issue:create", label: "Create issues" },
      { key: "issue:update", label: "Update issues" },
      { key: "issue:delete", label: "Delete issues" },
      { key: "issue:assign", label: "Assign issues" },
      { key: "issue:update_status", label: "Update issue status" },
    ],
  },
  {
    group: "Sprints",
    permissions: [
      { key: "sprint:create", label: "Create sprints" },
      { key: "sprint:start", label: "Start sprints" },
      { key: "sprint:complete", label: "Complete sprints" },
      { key: "sprint:delete", label: "Delete sprints" },
    ],
  },
  {
    group: "Teams",
    permissions: [
      { key: "team:create", label: "Create teams" },
      { key: "team:update", label: "Update teams" },
      { key: "team:delete", label: "Delete teams" },
      { key: "team:manage_members", label: "Manage team members" },
    ],
  },
  {
    group: "Roles",
    permissions: [
      { key: "role:create", label: "Create roles" },
      { key: "role:update", label: "Update roles" },
      { key: "role:delete", label: "Delete roles" },
      { key: "role:assign", label: "Assign roles to users" },
    ],
  },
]
