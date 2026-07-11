import { createDefaultLoader } from "@meridianjs/framework-utils"
import ApiTokenModel from "../models/api-token.js"

export default createDefaultLoader({
  models: [ApiTokenModel],
  ormKey: "apiTokenOrm",
})
