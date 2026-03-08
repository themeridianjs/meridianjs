import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  app_role_id: string | null
  is_active: boolean
}

interface UsersResponse {
  users: User[]
  count: number
}

export const userKeys = {
  all: ["users"] as const,
  list: () => [...userKeys.all, "list"] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => api.get<UsersResponse>("/admin/users"),
    select: (data) => data.users,
    staleTime: 1000 * 60 * 5, // 5 minutes — user list rarely changes
  })
}

export interface OrgInvitation {
  id: string
  email: string | null
  role: string
  status: "pending" | "accepted" | "revoked"
  token: string
  workspace_id: string | null
  workspace_name: string | null
  expires_at: string | null
  created_at: string
}

const invitationKeys = {
  all: ["org-invitations"] as const,
  list: () => [...invitationKeys.all, "list"] as const,
}

export function useOrgInvitations() {
  return useQuery({
    queryKey: invitationKeys.list(),
    queryFn: () => api.get<{ invitations: OrgInvitation[]; count: number }>("/admin/users/invitations"),
    select: (data) => data.invitations,
    staleTime: 1000 * 30,
  })
}

export function useRevokeOrgInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => api.delete(`/admin/users/invitations/${inviteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitationKeys.list() }),
  })
}

export function useResendOrgInvitation() {
  return useMutation({
    mutationFn: (inviteId: string) => api.post(`/admin/users/invitations/${inviteId}/resend`),
  })
}

export function useInviteOrgMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      api.post("/admin/users/invite", { email, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitationKeys.list() }),
  })
}

export function useUpdateUserGlobalRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/admin/users/${userId}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.list() }),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.list() }),
  })
}

export function useReactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/reactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.list() }),
  })
}

export function useUserMap() {
  return useQuery({
    queryKey: [...userKeys.list(), "map"],
    queryFn: () => api.get<UsersResponse>("/admin/users"),
    select: (data) =>
      new Map(
        data.users.map((u) => {
          const first = u.first_name ?? ""
          const last = u.last_name ?? ""
          const name = `${first} ${last}`.trim() || u.email
          const initials = (first[0] ?? last[0] ?? u.email?.[0] ?? "U").toUpperCase()
          return [u.id, { name, initials }]
        })
      ),
    staleTime: 1000 * 60 * 5,
  })
}
