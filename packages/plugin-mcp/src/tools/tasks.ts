import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  createIssueWorkflow,
  updateIssueStatusWorkflow,
  assignIssueWorkflow,
  hasProjectAccess,
  isGlobalAdmin,
  getAccessibleWorkspaceIds,
} from "@meridianjs/meridian"
import { EVENTS } from "@meridianjs/types"
import {
  type McpToolContext,
  asReqLike,
  canWrite,
  err,
  hasPermission,
  ok,
  workflowError,
} from "../helpers.js"

/**
 * Loads an issue and enforces the same project-level access rule the REST
 * routes use (assertIssueAccess). Returns { issue } or { error }.
 */
async function loadIssueWithAccess(ctx: McpToolContext, issueId: string) {
  const issueService = ctx.scope.resolve("issueModuleService") as any
  const issue = await issueService.retrieveIssue(issueId).catch(() => null)
  if (!issue) return { error: `Task ${issueId} not found` }

  if (issue.project_id) {
    const projectService = ctx.scope.resolve("projectModuleService") as any
    const project = await projectService.retrieveProject(issue.project_id).catch(() => null)
    // Fail closed: dangling project_id is only visible to global admins.
    if (!project) {
      if (!isGlobalAdmin(asReqLike(ctx))) return { error: "Forbidden" }
    } else if (!(await hasProjectAccess(asReqLike(ctx), project))) {
      return { error: "Forbidden" }
    }
  }
  return { issue }
}

/** Escapes LIKE wildcards so an email is matched literally (case-insensitively). */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&")
}

/**
 * Resolves assignee_emails to user ids and merges them with assignee_ids.
 * Returns { ids } on success or { error } naming every email that failed —
 * server-side resolution so clients can't pass a hallucinated user id.
 */
async function resolveAssigneeIds(
  ctx: McpToolContext,
  ids: string[] | undefined,
  emails: string[] | undefined
): Promise<{ ids: string[] } | { error: string }> {
  const merged = [...(ids ?? [])]
  if (emails && emails.length > 0) {
    const userService = ctx.scope.resolve("userModuleService") as any
    const [users] = await userService.listAndCountUsers(
      { $or: emails.map((e) => ({ email: { $ilike: escapeLike(e.trim()) } })) },
      { limit: emails.length * 2 }
    )
    const byEmail = new Map(
      (users as any[]).map((u) => [String(u.email).toLowerCase(), u])
    )
    const missing: string[] = []
    const inactive: string[] = []
    for (const email of emails) {
      const user = byEmail.get(email.trim().toLowerCase())
      if (!user) missing.push(email)
      else if (user.deleted_at || user.is_active === false) inactive.push(email)
      else merged.push(user.id)
    }
    if (missing.length > 0) {
      return { error: `No user found with email(s): ${missing.join(", ")} — use list_members to see valid members` }
    }
    if (inactive.length > 0) {
      return { error: `User(s) deactivated and cannot be assigned: ${inactive.join(", ")}` }
    }
  }
  return { ids: [...new Set(merged)] }
}

/** Project ids the caller may read — mirrors GET /admin/issues scoping. */
async function accessibleProjectIds(ctx: McpToolContext): Promise<string[]> {
  const projectService = ctx.scope.resolve("projectModuleService") as any
  if (isGlobalAdmin(asReqLike(ctx))) {
    const workspaceIds = await getAccessibleWorkspaceIds(asReqLike(ctx))
    if (workspaceIds.length === 0) return []
    const [projects] = await projectService.listAndCountProjects(
      { workspace_id: workspaceIds.length === 1 ? workspaceIds[0] : workspaceIds },
      { limit: 1000 }
    )
    return (projects as any[]).map((p) => p.id)
  }
  const teamMemberService = ctx.scope.resolve("teamMemberModuleService") as any
  const projectMemberService = ctx.scope.resolve("projectMemberModuleService") as any
  const teamIds = await teamMemberService.getUserTeamIds(ctx.user.id)
  return projectMemberService.getAccessibleProjectIds(ctx.user.id, teamIds)
}

export function registerTaskTools(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    "get_task",
    {
      title: "Get task",
      description: "Retrieve a single task/issue by its ID, including status, assignees, and dates.",
      inputSchema: {
        task_id: z.string().describe("The task/issue ID (use search_tasks to find IDs)"),
      },
    },
    async ({ task_id }) => {
      const { issue, error } = await loadIssueWithAccess(ctx, task_id)
      if (error) return err(error)
      return ok({ task: issue })
    }
  )

  server.registerTool(
    "search_tasks",
    {
      title: "Search tasks",
      description:
        "List or search tasks/issues. Filter by project, status, priority, assignee, or free-text search on title/identifier.",
      inputSchema: {
        project_id: z.string().optional().describe("Scope to one project (use list_projects for IDs)"),
        status: z.string().optional().describe("Status key, e.g. backlog / in_progress — see list_project_statuses"),
        priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
        assignee_id: z.string().optional().describe("User ID — see list_members"),
        search: z.string().optional().describe("Free-text match on title or identifier (e.g. PROJ-42)"),
        limit: z.number().int().min(1).max(100).optional().describe("Max results, default 25"),
      },
    },
    async (input) => {
      const issueService = ctx.scope.resolve("issueModuleService") as any
      const filters: Record<string, unknown> = {}

      if (input.project_id) {
        const projectService = ctx.scope.resolve("projectModuleService") as any
        const project = await projectService.retrieveProject(input.project_id).catch(() => null)
        if (!project) return err(`Project ${input.project_id} not found`)
        if (!(await hasProjectAccess(asReqLike(ctx), project))) return err("Forbidden")
        filters.project_id = input.project_id
      } else {
        const projectIds = await accessibleProjectIds(ctx)
        if (projectIds.length === 0) return ok({ tasks: [], count: 0 })
        filters.project_id = projectIds.length === 1 ? projectIds[0] : { $in: projectIds }
      }

      if (input.status) filters.status = input.status
      if (input.priority) filters.priority = input.priority
      if (input.assignee_id) filters.assignee_ids = { $contains: input.assignee_id }
      if (input.search) {
        const term = `%${input.search}%`
        filters.$or = [{ title: { $ilike: term } }, { identifier: { $ilike: term } }]
      }

      const limit = input.limit ?? 25
      const [tasks, count] = await issueService.listAndCountIssues(filters, {
        limit,
        orderBy: { updated_at: "DESC" },
      })
      return ok({ tasks, count, limit })
    }
  )

  if (!canWrite(ctx)) return

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description:
        "Create a new task/issue in a project. Call list_projects first to find the project ID, and list_project_statuses for valid status keys.",
      inputSchema: {
        title: z.string().min(1),
        project_id: z.string().describe("Target project ID (see list_projects)"),
        description: z.string().optional(),
        type: z.enum(["bug", "feature", "task", "epic", "story", "improvement"]).optional(),
        priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
        status: z.string().optional().describe("Status key (see list_project_statuses); defaults to backlog"),
        assignee_ids: z.array(z.string()).optional().describe("User IDs to assign (see list_members)"),
        assignee_emails: z.array(z.string()).optional().describe("Assign by email address — resolved to users server-side; combines with assignee_ids"),
        due_date: z.string().optional().describe("ISO 8601 date, e.g. 2026-08-01"),
        sprint_id: z.string().optional(),
        estimate: z.number().optional(),
        parent_id: z.string().optional().describe("Parent task ID, to create a subtask"),
      },
    },
    async (input) => {
      if (!hasPermission(ctx, "issue:create")) return err("Forbidden — missing issue:create permission")

      const projectService = ctx.scope.resolve("projectModuleService") as any
      const project = await projectService.retrieveProject(input.project_id).catch(() => null)
      if (!project) return err(`Project ${input.project_id} not found`)
      if (!(await hasProjectAccess(asReqLike(ctx), project))) return err("Forbidden")

      const assignees = await resolveAssigneeIds(ctx, input.assignee_ids, input.assignee_emails)
      if ("error" in assignees) return err(assignees.error)

      const { result: issue, errors, transaction_status } = await createIssueWorkflow(ctx.scope).run({
        input: {
          title: input.title,
          project_id: input.project_id,
          workspace_id: project.workspace_id,
          description: input.description,
          type: input.type,
          priority: input.priority,
          status: input.status,
          assignee_ids: assignees.ids.length > 0 ? assignees.ids : null,
          reporter_id: ctx.user?.id ?? null,
          parent_id: input.parent_id ?? null,
          due_date: input.due_date ? new Date(input.due_date) : undefined,
          sprint_id: input.sprint_id ?? null,
          estimate: input.estimate ?? null,
          actor_id: ctx.user?.id ?? null,
        },
      })
      if (transaction_status === "reverted") {
        return err(workflowError(errors, "Task creation failed"))
      }
      return ok({ task: issue })
    }
  )

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description:
        "Update a task/issue — change its status, reassign it, or edit title, description, priority, or due date. Only provided fields are changed.",
      inputSchema: {
        task_id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.string().optional().describe("Status key (see list_project_statuses)"),
        priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
        type: z.enum(["bug", "feature", "task", "epic", "story", "improvement"]).optional(),
        assignee_ids: z.array(z.string()).optional().describe("Replaces the full assignee list"),
        assignee_emails: z.array(z.string()).optional().describe("Assign by email address — resolved to users server-side; combines with assignee_ids to form the new full assignee list"),
        due_date: z.string().nullable().optional().describe("ISO 8601 date, or null to clear"),
        sprint_id: z.string().nullable().optional(),
        estimate: z.number().nullable().optional(),
      },
    },
    async (input) => {
      if (!hasPermission(ctx, "issue:update")) return err("Forbidden — missing issue:update permission")

      const { error } = await loadIssueWithAccess(ctx, input.task_id)
      if (error) return err(error)

      const issueService = ctx.scope.resolve("issueModuleService") as any
      let issue: any = null

      // Status changes go through the workflow so activity + events fire.
      if (input.status !== undefined) {
        const { result, errors, transaction_status } = await updateIssueStatusWorkflow(ctx.scope).run({
          input: { issueId: input.task_id, status: input.status, actor_id: ctx.user?.id ?? null },
        })
        if (transaction_status === "reverted") {
          return err(workflowError(errors, "Status update failed"))
        }
        issue = result
      }

      // Assignment changes likewise.
      if (input.assignee_ids !== undefined || input.assignee_emails !== undefined) {
        const assignees = await resolveAssigneeIds(ctx, input.assignee_ids, input.assignee_emails)
        if ("error" in assignees) return err(assignees.error)
        const { result, errors, transaction_status } = await assignIssueWorkflow(ctx.scope).run({
          input: {
            issueId: input.task_id,
            assignee_ids: assignees.ids,
            actor_id: ctx.user?.id ?? null,
          },
        })
        if (transaction_status === "reverted") {
          return err(workflowError(errors, "Assignment update failed"))
        }
        issue = result
      }

      const updates: Record<string, unknown> = {}
      if (input.title !== undefined) updates.title = input.title
      if (input.description !== undefined) updates.description = input.description
      if (input.priority !== undefined) updates.priority = input.priority
      if (input.type !== undefined) updates.type = input.type
      if (input.due_date !== undefined) updates.due_date = input.due_date ? new Date(input.due_date) : null
      if (input.sprint_id !== undefined) updates.sprint_id = input.sprint_id
      if (input.estimate !== undefined) updates.estimate = input.estimate

      if (Object.keys(updates).length > 0) {
        issue = await issueService.updateIssue(input.task_id, updates)
      } else if (!issue) {
        return err("No fields to update — provide at least one field besides task_id")
      }

      return ok({ task: issue })
    }
  )

  server.registerTool(
    "add_comment",
    {
      title: "Add comment",
      description: "Add a comment to a task/issue.",
      inputSchema: {
        task_id: z.string(),
        body: z.string().min(1).describe("Comment text"),
      },
    },
    async ({ task_id, body }) => {
      if (!hasPermission(ctx, "issue:create")) return err("Forbidden — missing issue:create permission")

      const { error } = await loadIssueWithAccess(ctx, task_id)
      if (error) return err(error)

      const issueService = ctx.scope.resolve("issueModuleService") as any
      const comment = await issueService.createComment({
        issue_id: task_id,
        body: body.trim(),
        author_id: ctx.user?.id ?? "system",
        metadata: null,
      })

      const eventBus = ctx.scope.resolve("eventBus") as any
      eventBus
        .emit({
          name: EVENTS.COMMENT_CREATED,
          data: { comment_id: comment.id, issue_id: task_id, author_id: comment.author_id, mentioned_user_ids: [] },
        })
        .catch(() => {})

      return ok({ comment })
    }
  )
}
