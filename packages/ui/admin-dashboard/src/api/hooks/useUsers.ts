import { useQuery } from "@tanstack/react-query"
import { api } from "../client"

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
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

export function useUserMap() {
  return useQuery({
    queryKey: [...userKeys.list(), "map"],
    queryFn: () => api.get<UsersResponse>("/admin/users"),
    select: (data) =>
      new Map(
        data.users.map((u) => [
          u.id,
          { name: `${u.first_name} ${u.last_name}`.trim(), initials: `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase() },
        ])
      ),
    staleTime: 1000 * 60 * 5,
  })
}
