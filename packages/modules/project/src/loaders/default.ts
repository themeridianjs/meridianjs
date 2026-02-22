import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridian/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridian/types"
import ProjectModel from "../models/project.js"
import LabelModel from "../models/label.js"
import MilestoneModel from "../models/milestone.js"

const ProjectSchema = dmlToEntitySchema(ProjectModel)
const LabelSchema = dmlToEntitySchema(LabelModel)
const MilestoneSchema = dmlToEntitySchema(MilestoneModel)

export const entitySchemas = [ProjectSchema, LabelSchema, MilestoneSchema]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm(entitySchemas, databaseUrl)
  const em = orm.em.fork()

  container.register({
    projectRepository: createRepository(em, "project"),
    labelRepository: createRepository(em, "label"),
    milestoneRepository: createRepository(em, "milestone"),
    projectOrm: orm,
  })
}
