import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("project:manage_access")(req, res, async () => {
    try {
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

      await projectMemberService.removeProjectMember(project.id, req.params.userId)

      const activityService = req.scope.resolve("activityModuleService") as any
      activityService.recordActivity({
        entity_type: "project", entity_id: project.id,
        actor_id: req.user?.id ?? "system", action: "member_removed",
        workspace_id: project.workspace_id,
        changes: { user_id: { from: req.params.userId, to: null } },
      }).catch(() => {})

      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })
}
