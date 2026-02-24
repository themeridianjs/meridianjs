import { Module } from "@meridianjs/framework-utils"
import { UserModuleService } from "./service.js"
import UserModel from "./models/user.js"
import TeamModel from "./models/team.js"
import defaultLoader from "./loaders/default.js"

export const USER_MODULE = "userModuleService"

export default Module(USER_MODULE, {
  service: UserModuleService,
  models: [UserModel, TeamModel],
  loaders: [defaultLoader],
  linkable: {
    user: { tableName: "user", primaryKey: "id" },
    team: { tableName: "team", primaryKey: "id" },
  },
})

export { UserModuleService }
export type { UserModuleService as IUserModuleService }
