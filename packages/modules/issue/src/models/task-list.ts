import { model } from "@meridian/framework-utils"

const TaskList = model.define("task_list", {
  id: model.id().primaryKey(),
  name: model.text(),
  description: model.text().nullable(),
  /** Denormalized — not a FK */
  project_id: model.text(),
  position: model.number().default(0),
}, [
  { columns: ["project_id"] },
])

export default TaskList
