import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import ProjectMemberModel from "../models/project-member.js"
import ProjectTeamModel from "../models/project-team.js"
import ProjectAccessRequestModel from "../models/project-access-request.js"

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const orm = await createModuleOrm(
    [dmlToEntitySchema(ProjectMemberModel), dmlToEntitySchema(ProjectTeamModel), dmlToEntitySchema(ProjectAccessRequestModel)],
    config.projectConfig.databaseUrl
  )
  const em = orm.em.fork()
  container.register({
    projectMemberRepository: createRepository(em, "project_member"),
    projectTeamRepository: createRepository(em, "project_team"),
    projectAccessRequestRepository: createRepository(em, "project_access_request"),
    projectMemberOrm: orm,
  })
}
