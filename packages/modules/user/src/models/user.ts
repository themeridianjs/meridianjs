import { model } from "@meridianjs/framework-utils"

const User = model.define("user", {
  id: model.id().primaryKey(),
  email: model.text(),
  password_hash: model.text(),
  first_name: model.text().nullable(),
  last_name: model.text().nullable(),
  avatar_url: model.text().nullable(),
  role: model.enum(["super-admin", "admin", "moderator", "member"]).default("member"),
  is_active: model.boolean().default(true),
  last_login_at: model.date().nullable(),
  app_role_id: model.text().nullable(),
  metadata: model.json().nullable(),
}, [
  { columns: ["email"], unique: true },
])

export default User
