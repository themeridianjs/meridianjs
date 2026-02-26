import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"

export const DELETE = async (req: any, res: Response) => {
  requirePermission("project:manage_access")(req, res, async () => {
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
    const projectService = req.scope.resolve("projectModuleService") as any

    const projectRef = req.params.id
    const project =
      (await projectService.retrieveProject(projectRef).catch(() => null)) ??
      (await projectService.retrieveProjectByIdentifier?.(projectRef).catch(() => null))
    if (!project) {
      res.status(404).json({ error: { message: `Project "${projectRef}" not found` } })
      return
    }

    await projectMemberService.removeProjectTeam(project.id, req.params.teamId)
    res.status(204).send()
  })
}
