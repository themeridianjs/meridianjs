import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import WorkspaceMemberModel from "../models/workspace-member.js"
import WorkspaceAccessRequestModel from "../models/workspace-access-request.js"

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const orm = await createModuleOrm(
    [dmlToEntitySchema(WorkspaceMemberModel), dmlToEntitySchema(WorkspaceAccessRequestModel)],
    config.projectConfig.databaseUrl
  )
  container.register({
    workspaceMemberRepository: createRepository(orm, "workspace_member"),
    workspaceAccessRequestRepository: createRepository(orm, "workspace_access_request"),
    workspaceMemberOrm: orm,
  })
}
