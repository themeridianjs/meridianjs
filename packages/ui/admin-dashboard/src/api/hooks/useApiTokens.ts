import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface ApiToken {
  id: string
  name: string
  token_prefix: string
  scopes: ("read" | "write")[]
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export interface CreateApiTokenInput {
  name: string
  scopes: ("read" | "write")[]
  expires_in_days?: number | null
}

export function useApiTokens() {
  return useQuery({
    queryKey: ["api-tokens"],
    queryFn: () => api.get<{ api_tokens: ApiToken[] }>("/admin/api-tokens"),
    select: (data) => data.api_tokens,
  })
}

export function useCreateApiToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateApiTokenInput) =>
      api.post<{ token: string; api_token: ApiToken }>("/admin/api-tokens", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-tokens"] })
    },
  })
}

export function useRevokeApiToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/api-tokens/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-tokens"] })
    },
  })
}
