import type { Response, NextFunction } from "express"
import { requireRoles } from "@meridianjs/auth"
import { ROLES } from "@meridianjs/types"

export const PUT = async (req: any, res: Response, next: NextFunction) => {
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN)(req, res, async () => {
    try {
      const service = req.scope.resolve("orgCalendarModuleService") as any
      const { name, date, recurring } = req.body
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name.trim()
      if (date !== undefined) updates.date = new Date(date)
      if (recurring !== undefined) updates.recurring = recurring === true

      const holiday = await service.updateOrgHoliday(req.params.holidayId, updates)
      res.json({ holiday })
    } catch (err) {
      next(err)
    }
  })
}

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN)(req, res, async () => {
    try {
      const service = req.scope.resolve("orgCalendarModuleService") as any
      await service.deleteOrgHoliday(req.params.holidayId)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })
}
