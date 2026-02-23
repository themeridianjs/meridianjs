import { Module } from "@meridian/framework-utils"
import { IssueModuleService } from "./service.js"
import IssueModel from "./models/issue.js"
import CommentModel from "./models/comment.js"
import AttachmentModel from "./models/attachment.js"
import TimeLogModel from "./models/time-log.js"
import defaultLoader from "./loaders/default.js"

export const ISSUE_MODULE = "issueModuleService"

export default Module(ISSUE_MODULE, {
  service: IssueModuleService,
  models: [IssueModel, CommentModel, AttachmentModel, TimeLogModel],
  loaders: [defaultLoader],
  linkable: {
    issue: { tableName: "issue", primaryKey: "id" },
    comment: { tableName: "comment", primaryKey: "id" },
    attachment: { tableName: "attachment", primaryKey: "id" },
    time_log: { tableName: "time_log", primaryKey: "id" },
  },
})

export { IssueModuleService }
