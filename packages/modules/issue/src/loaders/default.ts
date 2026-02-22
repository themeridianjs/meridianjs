import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridian/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridian/types"
import IssueModel from "../models/issue.js"
import CommentModel from "../models/comment.js"

const IssueSchema = dmlToEntitySchema(IssueModel)
const CommentSchema = dmlToEntitySchema(CommentModel)

export const entitySchemas = [IssueSchema, CommentSchema]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm(entitySchemas, databaseUrl)
  const em = orm.em.fork()

  container.register({
    issueRepository: createRepository(em, "issue"),
    commentRepository: createRepository(em, "comment"),
    issueOrm: orm,
  })
}
