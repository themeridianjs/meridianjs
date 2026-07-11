import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { hasProjectAccess } from "@meridianjs/meridian"
import { type McpToolContext, asReqLike, err, ok } from "../helpers.js"

function toSafeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
  }
}

export function registerMemberTools(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    "list_members",
    {
      title: "List members",
      description:
        "List users who can be assigned to tasks. Pass project_id to list that project's members; omit it to list all active users. Use the returned user IDs as assignee_ids.",
      inputSchema: {
        project_id: z.string().optional().describe("Scope to one project's members (see list_projects)"),
        limit: z.number().int().min(1).max(200).optional().describe("Max results, default 50"),
      },
    },
    async (input) => {
      const userService = ctx.scope.resolve("userModuleService") as any
      const limit = input.limit ?? 50

      if (input.project_id) {
        const projectService = ctx.scope.resolve("projectModuleService") as any
        const project = await projectService.retrieveProject(input.project_id).catch(() => null)
        if (!project) return err(`Project ${input.project_id} not found`)
        if (!(await hasProjectAccess(asReqLike(ctx), project))) return err("Forbidden")

        const projectMemberService = ctx.scope.resolve("projectMemberModuleService") as any
        const members = await projectMemberService.listProjectMembers(input.project_id)
        const userIds = (members as any[]).map((m) => m.user_id)
        if (userIds.length === 0) return ok({ members: [] })

        const [users] = await userService.listAndCountUsers(
          { id: userIds.length === 1 ? userIds[0] : { $in: userIds } },
          { limit: 200 }
        )
        const roleByUser = new Map((members as any[]).map((m) => [m.user_id, m.role]))
        return ok({
          members: (users as any[]).map((u) => ({ ...toSafeUser(u), project_role: roleByUser.get(u.id) ?? null })),
        })
      }

      const [users] = await userService.listAndCountUsers(
        { is_active: true },
        { limit, orderBy: { first_name: "ASC" } }
      )
      return ok({ members: (users as any[]).map(toSafeUser) })
    }
  )
}
