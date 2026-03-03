import { model } from "@meridianjs/framework-utils"

const OrgHoliday = model.define("org_holiday", {
  id: model.id().primaryKey(),
  name: model.text(),
  date: model.date(),
  recurring: model.boolean().default(false),
}, [
  { columns: ["date"] },
])

export default OrgHoliday
