import { Module } from "@meridianjs/framework-utils"
import { ApiTokenModuleService } from "./service.js"
import ApiTokenModel from "./models/api-token.js"
import defaultLoader from "./loaders/default.js"

export default Module("apiTokenModuleService", {
  service: ApiTokenModuleService,
  models: [ApiTokenModel],
  loaders: [defaultLoader],
})

export { ApiTokenModuleService, API_TOKEN_PREFIX } from "./service.js"
export type { ApiTokenScope } from "./service.js"
