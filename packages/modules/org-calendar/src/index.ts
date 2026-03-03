import { Module } from "@meridianjs/framework-utils"
import { OrgCalendarModuleService } from "./service.js"
import OrgCalendarModel from "./models/org-calendar.js"
import OrgHolidayModel from "./models/org-holiday.js"
import defaultLoader from "./loaders/default.js"

export default Module("orgCalendarModuleService", {
  service: OrgCalendarModuleService,
  models: [OrgCalendarModel, OrgHolidayModel],
  loaders: [defaultLoader],
})

export { OrgCalendarModuleService }
