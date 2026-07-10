import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import WorkspaceModel from "../models/workspace.js"

const WorkspaceSchema = dmlToEntitySchema(WorkspaceModel)

export const entitySchemas = [WorkspaceSchema]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm(entitySchemas, databaseUrl)

  container.register({
    workspaceRepository: createRepository(orm, "workspace"),
    workspaceOrm: orm,
  })
}
