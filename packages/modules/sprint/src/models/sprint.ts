import { model } from "@meridianjs/framework-utils"

const Sprint = model.define("sprint", {
  id: model.id().primaryKey(),
  name: model.text(),
  goal: model.text().nullable(),
  project_id: model.text(),
  status: model.enum(["planned", "active", "completed"]).default("planned"),
  start_date: model.date().nullable(),
  end_date: model.date().nullable(),
  /** Arbitrary key/value storage for custom integrations */
  metadata: model.json().nullable(),
})

export default Sprint
