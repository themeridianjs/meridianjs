import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const name = typeof req.query.name === "string" ? req.query.name : ""
  const identifier = projectService.generateIdentifier(name || "Project")
  res.json({ identifier })
}
