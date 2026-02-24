import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import UserModel from "../models/user.js"
import TeamModel from "../models/team.js"

const UserSchema = dmlToEntitySchema(UserModel)
const TeamSchema = dmlToEntitySchema(TeamModel)

export const entitySchemas = [UserSchema, TeamSchema]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm(entitySchemas, databaseUrl)
  const em = orm.em.fork()

  container.register({
    userRepository: createRepository(em, "user"),
    teamRepository: createRepository(em, "team"),
    userOrm: orm,
  })
}
