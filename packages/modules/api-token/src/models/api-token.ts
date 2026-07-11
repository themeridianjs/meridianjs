import { model } from "@meridianjs/framework-utils"

const ApiToken = model.define(
  "api_token",
  {
    id: model.id().primaryKey(),
    user_id: model.text(),
    name: model.text(),
    token_hash: model.text(),
    token_prefix: model.text(),
    scopes: model.json(),
    expires_at: model.date().nullable(),
    last_used_at: model.date().nullable(),
    revoked_at: model.date().nullable(),
  },
  [
    { columns: ["token_hash"], unique: true },
    { columns: ["user_id"] },
  ]
)

export default ApiToken
