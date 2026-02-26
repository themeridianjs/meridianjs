import { model } from "@meridianjs/framework-utils"

const AppRole = model.define("app_role", {
  id: model.id().primaryKey(),
  name: model.text(),
  description: model.text().nullable(),
  is_system: model.boolean().default(false),
  permissions: model.json(),
}, [
  { columns: ["name"], unique: true },
])

export default AppRole
