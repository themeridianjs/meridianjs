import { useQuery } from "@tanstack/react-query"
import { api } from "../client"

export interface AppConfig {
  maxChildIssueDepth: number
  googleOAuthEnabled: boolean
  appName?: string
  logoUrl?: string
}

export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: () => api.get<AppConfig>("/admin/config"),
    staleTime: Infinity,
  })
}
