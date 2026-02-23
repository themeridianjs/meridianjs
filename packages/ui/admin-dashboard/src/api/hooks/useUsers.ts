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
