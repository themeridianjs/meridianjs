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
  const em = orm.em.fork()
  container.register({
    workspaceMemberRepository: createRepository(em, "workspace_member"),
    workspaceAccessRequestRepository: createRepository(em, "workspace_access_request"),
    workspaceMemberOrm: orm,
  })
}
