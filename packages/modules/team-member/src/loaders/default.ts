import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import TeamMemberModel from "../models/team-member.js"

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const orm = await createModuleOrm(
    [dmlToEntitySchema(TeamMemberModel)],
    config.projectConfig.databaseUrl
  )
  container.register({
    teamMemberRepository: createRepository(orm, "team_member"),
    teamMemberOrm: orm,
  })
}
