import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const identifier = req.params.identifier
  if (!identifier) { res.status(400).json({ error: { message: "identifier is required" } }); return }
  const project = await projectService.retrieveProjectByIdentifier(identifier)
  if (!project) { res.status(404).json({ error: { message: `Project with identifier "${identifier}" not found` } }); return }
  res.json({ project })
}
