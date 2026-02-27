import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"

export const POST = async (req: any, res: Response) => {
  requirePermission("project:manage_access")(req, res, async () => {
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
    const projectService = req.scope.resolve("projectModuleService") as any
    const eventBus = req.scope.resolve("eventBus") as any
    const { user_id, role } = req.body

    if (!user_id) {
      res.status(400).json({ error: { message: "user_id is required" } })
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

    await projectMemberService.ensureProjectMember(project.id, user_id, role ?? "member")

    await eventBus.emit({
      name: "project.member_added",
      data: {
        project_id: project.id,
        project_name: project.name,
        workspace_id: project.workspace_id,
        user_id,
        actor_id: req.user?.id ?? "system",
      },
    }).catch(() => {})

    res.status(201).json({ ok: true })
  })
}
