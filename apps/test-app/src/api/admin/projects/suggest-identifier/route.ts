import type { Response } from "express"

/**
 * GET /admin/projects/suggest-identifier?name=...
 * Returns a suggested project key from the project name (same logic as create-project workflow).
 */
export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const name = typeof req.query.name === "string" ? req.query.name : ""

  const identifier = projectService.generateIdentifier(name || "Project")
  res.json({ identifier })
}
