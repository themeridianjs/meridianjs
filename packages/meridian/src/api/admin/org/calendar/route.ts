import type { Response, NextFunction } from "express"
import { requireRoles } from "@meridianjs/auth"

export const GET = async (req: any, res: Response, next: NextFunction) => {
  try {
    const service = req.scope.resolve("orgCalendarModuleService") as any
    const calendar = await service.getOrCreateCalendar()
    res.json({ working_days: calendar.working_days, timezone: calendar.timezone })
  } catch (err) {
    next(err)
  }
}

export const PUT = async (req: any, res: Response, next: NextFunction) => {
  requireRoles("super-admin", "admin")(req, res, async () => {
    try {
      const service = req.scope.resolve("orgCalendarModuleService") as any
      const { working_days, timezone } = req.body

      const calendar = await service.getOrCreateCalendar()

      const updates: Record<string, unknown> = {}
      if (working_days && typeof working_days === "object") {
        const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        const normalized: Record<string, boolean> = {}
        for (const day of days) {
          normalized[day] = working_days[day] === true
        }
        updates.working_days = normalized
      }
      if (timezone !== undefined) updates.timezone = timezone ?? null

      const updated = await service.updateOrgCalendar(calendar.id, updates)
      res.json({ working_days: updated.working_days, timezone: updated.timezone })
    } catch (err) {
      next(err)
    }
  })
}
