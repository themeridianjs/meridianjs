import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridian/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridian/types"
import WorkspaceModel from "../models/workspace.js"

const WorkspaceSchema = dmlToEntitySchema(WorkspaceModel)

export const entitySchemas = [WorkspaceSchema]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm(entitySchemas, databaseUrl)
  const em = orm.em.fork()

  container.register({
    workspaceRepository: createRepository(em, "workspace"),
    workspaceOrm: orm,
  })
}
