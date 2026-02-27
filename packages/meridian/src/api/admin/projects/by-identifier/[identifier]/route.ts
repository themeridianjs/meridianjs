import type { Response } from "express"
import { hasProjectAccess } from "../../../../utils/project-access.js"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const identifier = req.params.identifier
  if (!identifier) { res.status(400).json({ error: { message: "identifier is required" } }); return }
  const project = await projectService.retrieveProjectByIdentifier(identifier).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: `Project "${identifier}" not found` } }); return }

  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }

  res.json({ project })
}
