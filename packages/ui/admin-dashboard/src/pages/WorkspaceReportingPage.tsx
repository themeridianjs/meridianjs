import { useAuth } from "@/stores/auth"
import { ReportingPage } from "./ReportingPage"

export function WorkspaceReportingPage() {
  const { workspace } = useAuth()
  return <ReportingPage workspaceId={workspace?.id} />
}
