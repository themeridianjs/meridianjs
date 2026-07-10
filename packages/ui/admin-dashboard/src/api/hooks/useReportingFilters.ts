import { useQuery } from "@tanstack/react-query"
import { api } from "../client"
import { buildQuery } from "@/lib/buildQuery"

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
    queryFn: () =>
      api.get<{ members: ReportingMember[] }>(
        `/admin/reporting/members${buildQuery({
          workspace_ids: workspaceIds.join(","),
          project_ids: projectIds.join(","),
          org_scope: orgScope || undefined,
        })}`
      ),
    select: (data) => data.members,
  })
}
