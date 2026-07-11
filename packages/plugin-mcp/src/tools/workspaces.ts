import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { isGlobalAdmin } from "@meridianjs/meridian"
import { type McpToolContext, asReqLike, ok } from "../helpers.js"

export function registerWorkspaceTools(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    "list_workspaces",
    {
      title: "List workspaces",
      description:
        "List the workspaces the caller can access. Use the returned workspace IDs with list_projects' workspace_id filter to browse a workspace's projects.",
      inputSchema: {
        search: z.string().optional().describe("Filter by workspace name"),
        limit: z.number().int().min(1).max(200).optional().describe("Max results, default 50"),
      },
    },
    async (input) => {
      const workspaceService = ctx.scope.resolve("workspaceModuleService") as any
      const workspaceMemberService = ctx.scope.resolve("workspaceMemberModuleService") as any
      const limit = input.limit ?? 50
      const filters: Record<string, unknown> = {}
      if (input.search) filters.name = { $ilike: `%${input.search}%` }

      // Mirrors GET /admin/workspaces: admins see all non-private workspaces
      // plus private ones they belong to; members see only their memberships.
      const userWorkspaceIds: string[] = await workspaceMemberService.getWorkspaceIdsForUser(
        ctx.user.id
      )

      let workspaces: any[]
      if (isGlobalAdmin(asReqLike(ctx))) {
        const [all] = await workspaceService.listAndCountWorkspaces(filters, {
          limit,
          orderBy: { name: "ASC" },
        })
        const memberSet = new Set(userWorkspaceIds)
        workspaces = (all as any[]).filter((w) => !w.is_private || memberSet.has(w.id))
      } else {
        if (userWorkspaceIds.length === 0) return ok({ workspaces: [], count: 0 })
        filters.id = userWorkspaceIds.length === 1 ? userWorkspaceIds[0] : { $in: userWorkspaceIds }
        const [own] = await workspaceService.listAndCountWorkspaces(filters, {
          limit,
          orderBy: { name: "ASC" },
        })
        workspaces = own as any[]
      }

      const slim = workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        plan: w.plan,
        is_private: w.is_private,
      }))
      return ok({ workspaces: slim, count: slim.length })
    }
  )
}
