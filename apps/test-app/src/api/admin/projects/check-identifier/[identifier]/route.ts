import type { Response } from "express"

/**
 * GET /admin/projects/check-identifier/:identifier
 * Returns whether the project key is available (not already used).
 * Always 200 with { available: boolean }; same normalization as workflow (uppercase).
 */
export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const raw = req.params.identifier ?? ""
  const identifier = raw.toUpperCase().replace(/[^A-Z0-9]/g, "")

  if (!identifier) {
    res.json({ available: false })
    return
  }

  const existing = await projectService.retrieveProjectByIdentifier(identifier)
  res.json({ available: !existing })
}
