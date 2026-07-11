import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { hasProjectAccess, isGlobalAdmin, getAccessibleWorkspaceIds } from "@meridianjs/meridian"
import { type McpToolContext, asReqLike, err, ok } from "../helpers.js"

export function registerProjectTools(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description:
        "List the projects the caller can access. Use the returned project IDs with create_task and search_tasks.",
      inputSchema: {
        search: z.string().optional().describe("Filter by project name"),
        limit: z.number().int().min(1).max(200).optional().describe("Max results, default 50"),
      },
    },
    async (input) => {
      const projectService = ctx.scope.resolve("projectModuleService") as any
      const limit = input.limit ?? 50
      const filters: Record<string, unknown> = {}
      if (input.search) filters.name = { $ilike: `%${input.search}%` }

      if (isGlobalAdmin(asReqLike(ctx))) {
        const workspaceIds = await getAccessibleWorkspaceIds(asReqLike(ctx))
        if (workspaceIds.length === 0) return ok({ projects: [], count: 0 })
        filters.workspace_id = workspaceIds.length === 1 ? workspaceIds[0] : workspaceIds
      } else {
        const teamMemberService = ctx.scope.resolve("teamMemberModuleService") as any
        const projectMemberService = ctx.scope.resolve("projectMemberModuleService") as any
        const teamIds = await teamMemberService.getUserTeamIds(ctx.user.id)
        const projectIds = await projectMemberService.getAccessibleProjectIds(ctx.user.id, teamIds)
        if (projectIds.length === 0) return ok({ projects: [], count: 0 })
        filters.id = projectIds.length === 1 ? projectIds[0] : { $in: projectIds }
      }

      const [projects, count] = await projectService.listAndCountProjects(filters, {
        limit,
        orderBy: { name: "ASC" },
      })
      const slim = (projects as any[]).map((p) => ({
        id: p.id,
        name: p.name,
        identifier: p.identifier,
        workspace_id: p.workspace_id,
        status: p.status,
        description: p.description,
      }))
      return ok({ projects: slim, count })
    }
  )

  server.registerTool(
    "list_project_statuses",
    {
      title: "List project statuses",
      description:
        "List the workflow statuses (board columns) of a project. Use the returned status keys with create_task and update_task.",
      inputSchema: {
        project_id: z.string().describe("Project ID (see list_projects)"),
      },
    },
    async ({ project_id }) => {
      const projectService = ctx.scope.resolve("projectModuleService") as any
      const project = await projectService.retrieveProject(project_id).catch(() => null)
      if (!project) return err(`Project ${project_id} not found`)
      if (!(await hasProjectAccess(asReqLike(ctx), project))) return err("Forbidden")

      const statuses = await projectService.listStatusesByProject(project_id)
      const slim = (statuses as any[]).map((s) => ({
        key: s.key,
        name: s.name,
        category: s.category,
        position: s.position,
      }))
      return ok({ statuses: slim })
    }
  )
}
