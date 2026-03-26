import { useQuery } from "@tanstack/react-query"
import { api } from "../client"

export interface ReportingMember {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

export function useReportingMembers(workspaceIds: string[], projectIds: string[], options?: { orgScope?: boolean }) {
  const orgScope = options?.orgScope ?? false
  return useQuery({
    queryKey: ["reporting", "members", workspaceIds.join(","), projectIds.join(","), orgScope],
    queryFn: () => {
      const params = new URLSearchParams()
      if (workspaceIds.length) params.set("workspace_ids", workspaceIds.join(","))
      if (projectIds.length) params.set("project_ids", projectIds.join(","))
      if (orgScope) params.set("org_scope", "true")
      return api.get<{ members: ReportingMember[] }>(`/admin/reporting/members?${params}`)
    },
    select: (data) => data.members,
  })
}
