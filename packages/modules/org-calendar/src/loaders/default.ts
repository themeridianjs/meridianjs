import { dmlToEntitySchema, createRepository, createModuleOrm } from "@meridianjs/framework-utils"
import type { LoaderOptions, MeridianConfig } from "@meridianjs/types"
import OrgCalendarModel from "../models/org-calendar.js"
import OrgHolidayModel from "../models/org-holiday.js"

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve<MeridianConfig>("config")
  const orm = await createModuleOrm(
    [dmlToEntitySchema(OrgCalendarModel), dmlToEntitySchema(OrgHolidayModel)],
    config.projectConfig.databaseUrl
  )
  const em = orm.em.fork()

  container.register({
    orgCalendarRepository: createRepository(em, "org_calendar"),
    orgHolidayRepository: createRepository(em, "org_holiday"),
    orgCalendarOrm: orm,
  })
}
