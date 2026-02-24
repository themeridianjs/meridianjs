import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const identifier = (req.params.identifier ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!identifier) { res.json({ available: false }); return }
  const existing = await projectService.retrieveProjectByIdentifier(identifier)
  res.json({ available: !existing })
}
