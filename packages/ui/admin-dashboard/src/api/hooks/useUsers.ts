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

export interface PaginatedUsersResponse {
  users: User[]
  count: number
  limit: number
  offset: number
}

export const userKeys = {
  all: ["users"] as const,
  list: (params?: { limit?: number; offset?: number; q?: string }) =>
    [...userKeys.all, "list", params ?? {}] as const,
}

export function useUsers(params?: { limit?: number; offset?: number; q?: string }) {
  const { limit = 20, offset = 0, q = "" } = params ?? {}
  const searchParams = new URLSearchParams()
  searchParams.set("limit", String(limit))
  searchParams.set("offset", String(offset))
  if (q) searchParams.set("q", q)

  return useQuery({
    queryKey: userKeys.list({ limit, offset, q }),
    queryFn: () => api.get<PaginatedUsersResponse>(`/admin/users?${searchParams}`),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
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

export interface PaginatedInvitationsResponse {
  invitations: OrgInvitation[]
  count: number
  limit: number
  offset: number
}

const invitationKeys = {
  all: ["org-invitations"] as const,
  list: (params?: { limit?: number; offset?: number; q?: string }) =>
    [...invitationKeys.all, "list", params ?? {}] as const,
}

export function useOrgInvitations(params?: { limit?: number; offset?: number; q?: string }) {
  const { limit = 20, offset = 0, q = "" } = params ?? {}
  const searchParams = new URLSearchParams()
  searchParams.set("limit", String(limit))
  searchParams.set("offset", String(offset))
  if (q) searchParams.set("q", q)

  return useQuery({
    queryKey: invitationKeys.list({ limit, offset, q }),
    queryFn: () => api.get<PaginatedInvitationsResponse>(`/admin/users/invitations?${searchParams}`),
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  })
}

export function useRevokeOrgInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => api.delete(`/admin/users/invitations/${inviteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitationKeys.all }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: invitationKeys.all }),
  })
}

export function useUpdateUserGlobalRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/admin/users/${userId}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useReactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/reactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

interface UserMapEntry {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

interface UserMapResponse {
  users: UserMapEntry[]
}

export interface LightweightUser {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

export function useAllUsers() {
  return useQuery({
    queryKey: [...userKeys.all, "map-list"],
    queryFn: () => api.get<UserMapResponse>("/admin/users/map"),
    select: (data): LightweightUser[] => data.users,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUserMap() {
  return useQuery({
    queryKey: [...userKeys.all, "map"],
    queryFn: () => api.get<UserMapResponse>("/admin/users/map"),
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
