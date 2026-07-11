import type { Response, NextFunction } from "express"

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  try {
    const apiTokenService = req.scope.resolve("apiTokenModuleService") as any
    const record = await apiTokenService.retrieveApiToken(req.params.id).catch(() => null)
    if (!record) {
      res.status(404).json({ error: { message: "API token not found" } })
      return
    }
    if (record.user_id !== req.user.id) {
      res.status(403).json({ error: { message: "Forbidden" } })
      return
    }
    await apiTokenService.revokeToken(record.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
