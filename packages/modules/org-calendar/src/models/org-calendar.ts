import { model } from "@meridianjs/framework-utils"

const OrgCalendar = model.define("org_calendar", {
  id: model.id().primaryKey(),
  // JSON object: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }
  working_days: model.json().nullable(),
  timezone: model.text().nullable(),
})

export default OrgCalendar
