import { useQuery } from "@tanstack/react-query"
import { api } from "../client"

export interface ReportingMember {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

export function useReportingMembers(workspaceIds: string[], projectIds: string[]) {
  return useQuery({
    queryKey: ["reporting", "members", workspaceIds, projectIds],
    queryFn: () => {
      const params = new URLSearchParams()
      if (workspaceIds.length) params.set("workspace_ids", workspaceIds.join(","))
      if (projectIds.length) params.set("project_ids", projectIds.join(","))
      return api.get<{ members: ReportingMember[] }>(`/admin/reporting/members?${params}`)
    },
    select: (data) => data.members,
  })
}
