import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import SprintModel from "../models/sprint.js"

const SprintSchema = dmlToEntitySchema(SprintModel)

export const entitySchemas = [SprintSchema]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm(entitySchemas, databaseUrl)

  container.register({
    sprintRepository: createRepository(orm, "sprint"),
    sprintOrm: orm,
  })
}
