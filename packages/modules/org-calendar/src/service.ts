import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import OrgCalendarModel from "./models/org-calendar.js"
import OrgHolidayModel from "./models/org-holiday.js"

const DEFAULT_WORKING_DAYS = {
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: false,
  sun: false,
}

export class OrgCalendarModuleService extends MeridianService({
  OrgCalendar: OrgCalendarModel,
  OrgHoliday: OrgHolidayModel,
}) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  async getOrCreateCalendar(): Promise<{ id: string; working_days: Record<string, boolean>; timezone: string | null }> {
    const repo = this.container.resolve<any>("orgCalendarRepository")
    const results = await repo.find({}, { limit: 1 })
    const existing = results[0]
    if (existing) return existing

    const calendar = repo.create({
      working_days: DEFAULT_WORKING_DAYS,
      timezone: null,
    })
    await repo.persistAndFlush(calendar)
    return calendar
  }

  async listHolidaysByYear(year: number): Promise<any[]> {
    const repo = this.container.resolve<any>("orgHolidayRepository")
    const all = await repo.find({})
    return all.filter((h: any) => {
      const d = new Date(h.date)
      return d.getFullYear() === year || h.recurring === true
    })
  }
}
