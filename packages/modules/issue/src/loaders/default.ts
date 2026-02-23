import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridian/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridian/types"
import IssueModel from "../models/issue.js"
import CommentModel from "../models/comment.js"
import AttachmentModel from "../models/attachment.js"
import TimeLogModel from "../models/time-log.js"
import TaskListModel from "../models/task-list.js"

const IssueSchema = dmlToEntitySchema(IssueModel)
const CommentSchema = dmlToEntitySchema(CommentModel)
const AttachmentSchema = dmlToEntitySchema(AttachmentModel)
const TimeLogSchema = dmlToEntitySchema(TimeLogModel)
const TaskListSchema = dmlToEntitySchema(TaskListModel)

export const entitySchemas = [IssueSchema, CommentSchema, AttachmentSchema, TimeLogSchema, TaskListSchema]

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const { databaseUrl } = config.projectConfig

  const orm = await createModuleOrm(entitySchemas, databaseUrl)
  const em = orm.em.fork()

  container.register({
    issueRepository: createRepository(em, "issue"),
    commentRepository: createRepository(em, "comment"),
    attachmentRepository: createRepository(em, "attachment"),
    timeLogRepository: createRepository(em, "time_log"),
    taskListRepository: createRepository(em, "task_list"),
    issueOrm: orm,
  })
}
