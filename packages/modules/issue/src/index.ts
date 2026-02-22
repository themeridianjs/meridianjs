import { Module } from "@meridian/framework-utils"
import { IssueModuleService } from "./service.js"
import IssueModel from "./models/issue.js"
import CommentModel from "./models/comment.js"
import defaultLoader from "./loaders/default.js"

export const ISSUE_MODULE = "issueModuleService"

export default Module(ISSUE_MODULE, {
  service: IssueModuleService,
  models: [IssueModel, CommentModel],
  loaders: [defaultLoader],
  linkable: {
    issue: { tableName: "issue", primaryKey: "id" },
    comment: { tableName: "comment", primaryKey: "id" },
  },
})

export { IssueModuleService }
