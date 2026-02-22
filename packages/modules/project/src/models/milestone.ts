import { model } from "@meridian/framework-utils"

const Milestone = model.define("milestone", {
  id: model.id().primaryKey(),
  name: model.text(),
  description: model.text().nullable(),
  project_id: model.text(),
  status: model.enum(["open", "closed"]).default("open"),
  due_date: model.date().nullable(),
})

export default Milestone
