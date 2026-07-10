import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import UserModel from "../models/user.js"
import TeamModel from "../models/team.js"
import UserSessionModel from "../models/user-session.js"

const UserSchema = dmlToEntitySchema(UserModel)
const TeamSchema = dmlToEntitySchema(TeamModel)
const UserSessionSchema = dmlToEntitySchema(UserSessionModel)

export const entitySchemas = [UserSchema, TeamSchema, UserSessionSchema]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm(entitySchemas, databaseUrl)

  container.register({
    userRepository: createRepository(orm, "user"),
    teamRepository: createRepository(orm, "team"),
    userSessionRepository: createRepository(orm, "user_session"),
    userOrm: orm,
  })
}
