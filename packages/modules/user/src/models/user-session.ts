import { model } from "@meridianjs/framework-utils"

const UserSession = model.define("user_session", {
  id: model.id().primaryKey(),
  user_id: model.text(),
  jti: model.text(),
  expires_at: model.date(),
  revoked_at: model.date().nullable(),
}, [
  { columns: ["jti"], unique: true },
  { columns: ["user_id"] },
])

export default UserSession
