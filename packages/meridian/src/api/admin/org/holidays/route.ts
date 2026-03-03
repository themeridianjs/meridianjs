import type { Response, NextFunction } from "express"
import { requireRoles } from "@meridianjs/auth"

export const GET = async (req: any, res: Response, next: NextFunction) => {
  try {
    const service = req.scope.resolve("orgCalendarModuleService") as any
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear()
    const holidays = await service.listHolidaysByYear(year)
    res.json({ holidays, count: holidays.length })
  } catch (err) {
    next(err)
  }
}

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requireRoles("super-admin", "admin")(req, res, async () => {
    try {
      const service = req.scope.resolve("orgCalendarModuleService") as any
      const { name, date, recurring } = req.body

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ error: { message: "name is required" } })
        return
      }
      if (!date || typeof date !== "string") {
        res.status(400).json({ error: { message: "date is required (YYYY-MM-DD)" } })
        return
      }

      const holiday = await service.createOrgHoliday({
        name: name.trim(),
        date: new Date(date),
        recurring: recurring === true,
      })
      res.status(201).json({ holiday })
    } catch (err) {
      next(err)
    }
  })
}
