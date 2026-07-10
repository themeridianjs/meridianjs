import { createDefaultLoader } from "@meridianjs/framework-utils"
import IssueModel from "../models/issue.js"
import CommentModel from "../models/comment.js"
import AttachmentModel from "../models/attachment.js"
import TimeLogModel from "../models/time-log.js"
import TaskListModel from "../models/task-list.js"

export default createDefaultLoader({
  models: [IssueModel, CommentModel, AttachmentModel, TimeLogModel, TaskListModel],
  ormKey: "issueOrm",
})
