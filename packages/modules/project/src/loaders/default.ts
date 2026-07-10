import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import ProjectModel from "../models/project.js"
import LabelModel from "../models/label.js"
import MilestoneModel from "../models/milestone.js"
import ProjectStatusModel from "../models/project-status.js"
import ProjectHealthUpdateModel from "../models/project-health-update.js"

const ProjectSchema = dmlToEntitySchema(ProjectModel)
const LabelSchema = dmlToEntitySchema(LabelModel)
const MilestoneSchema = dmlToEntitySchema(MilestoneModel)
const ProjectStatusSchema = dmlToEntitySchema(ProjectStatusModel)
const ProjectHealthUpdateSchema = dmlToEntitySchema(ProjectHealthUpdateModel)

export const entitySchemas = [ProjectSchema, LabelSchema, MilestoneSchema, ProjectStatusSchema, ProjectHealthUpdateSchema]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm(entitySchemas, databaseUrl)

  container.register({
    projectRepository: createRepository(orm, "project"),
    labelRepository: createRepository(orm, "label"),
    milestoneRepository: createRepository(orm, "milestone"),
    projectStatusRepository: createRepository(orm, "project_status"),
    projectHealthUpdateRepository: createRepository(orm, "project_health_update"),
    projectOrm: orm,
  })
}
