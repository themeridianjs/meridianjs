import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import ProjectModel from "../models/project.js"
import LabelModel from "../models/label.js"
import MilestoneModel from "../models/milestone.js"
import ProjectStatusModel from "../models/project-status.js"

const ProjectSchema = dmlToEntitySchema(ProjectModel)
const LabelSchema = dmlToEntitySchema(LabelModel)
const MilestoneSchema = dmlToEntitySchema(MilestoneModel)
const ProjectStatusSchema = dmlToEntitySchema(ProjectStatusModel)

export const entitySchemas = [ProjectSchema, LabelSchema, MilestoneSchema, ProjectStatusSchema]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm(entitySchemas, databaseUrl)
  const em = orm.em.fork()

  container.register({
    projectRepository: createRepository(em, "project"),
    labelRepository: createRepository(em, "label"),
    milestoneRepository: createRepository(em, "milestone"),
    projectStatusRepository: createRepository(em, "project_status"),
    projectOrm: orm,
  })
}
