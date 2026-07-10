import type { Response, NextFunction } from "express"
import type { UserModuleService } from "@meridianjs/user"
import type { WorkspaceMemberModuleService } from "@meridianjs/workspace-member"
import { isGlobalAdmin } from "../../../utils/project-access.js"

/**
 * Lightweight endpoint that returns users with only the fields needed
 * for lookup maps and dropdowns. Scoped to accessible workspaces for
 * non-privileged users.
 */
export const GET = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userService = req.scope.resolve("userModuleService") as UserModuleService
    const permissions: string[] = req.user?.permissions ?? []
    const isPrivileged = isGlobalAdmin(req) || permissions.includes("workspace:admin")

    let users: any[]

    if (isPrivileged) {
      users = await (userService as any).listUsers({})
    } else {
      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as WorkspaceMemberModuleService
      const accessibleWsIds = await workspaceMemberService.getWorkspaceIdsForUser(req.user?.id)
      if (accessibleWsIds.length === 0) {
        res.json({ users: [], count: 0 })
        return
      }
      const wsMembers = await (workspaceMemberService as any).listWorkspaceMembers(
        { workspace_id: accessibleWsIds.length === 1 ? accessibleWsIds[0] : accessibleWsIds }
      )
      const userIds = [...new Set((wsMembers as any[]).map((m: any) => m.user_id))]
      if (userIds.length === 0) {
        res.json({ users: [], count: 0 })
        return
      }
      const userMap = await (userService as any).listUsersByIds(userIds)
      users = [...userMap.values()]
    }

    const mapped = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      avatar_url: u.avatar_url ?? null,
    }))
    res.json({ users: mapped, count: mapped.length })
  } catch (err) {
    next(err)
  }
}
