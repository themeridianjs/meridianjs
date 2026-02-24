import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import ActivityModel from "../models/activity.js"

const ActivitySchema = dmlToEntitySchema(ActivityModel)

export const entitySchemas = [ActivitySchema]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm(entitySchemas, databaseUrl)
  const em = orm.em.fork()

  container.register({
    activityRepository: createRepository(em, "activity"),
    activityOrm: orm,
  })
}
