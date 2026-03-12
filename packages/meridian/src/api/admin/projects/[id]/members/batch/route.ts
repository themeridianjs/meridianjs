import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("project:manage_access")(req, res, async () => {
    try {
      const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
      const projectService = req.scope.resolve("projectModuleService") as any
      const eventBus = req.scope.resolve("eventBus") as any
      const activityService = req.scope.resolve("activityModuleService") as any

      const { user_ids, role } = req.body

      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        res.status(400).json({ error: { message: "user_ids must be a non-empty array" } })
        return
      }

      const projectRef = req.params.id
      const project =
        (await projectService.retrieveProject(projectRef).catch(() => null)) ??
        (await projectService.retrieveProjectByIdentifier?.(projectRef).catch(() => null))
      if (!project) {
        res.status(404).json({ error: { message: `Project "${projectRef}" not found` } })
        return
      }

      const memberRole = role ?? "member"
      let added = 0
      let skipped = 0

      for (const userId of user_ids) {
        try {
          await projectMemberService.ensureProjectMember(project.id, userId, memberRole)
          added++
        } catch {
          skipped++
          continue
        }

        eventBus.emit({
          name: "project.member_added",
          data: {
            project_id: project.id,
            project_name: project.name,
            workspace_id: project.workspace_id,
            user_id: userId,
            actor_id: req.user?.id ?? "system",
          },
        }).catch(() => {})

        activityService.recordActivity({
          entity_type: "project",
          entity_id: project.id,
          actor_id: req.user?.id ?? "system",
          action: "member_added",
          workspace_id: project.workspace_id,
          changes: { user_id: { from: null, to: userId }, role: { from: null, to: memberRole } },
        }).catch(() => {})
      }

      res.status(201).json({ added, skipped })
    } catch (err) {
      next(err)
    }
  })
}
