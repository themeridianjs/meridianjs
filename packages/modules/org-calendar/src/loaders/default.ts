import { createDefaultLoader } from "@meridianjs/framework-utils"
import OrgCalendarModel from "../models/org-calendar.js"
import OrgHolidayModel from "../models/org-holiday.js"

export default createDefaultLoader({
  models: [OrgCalendarModel, OrgHolidayModel],
  ormKey: "orgCalendarOrm",
})
