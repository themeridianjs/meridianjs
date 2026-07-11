import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpToolContext } from "../helpers.js"
import { registerTaskTools } from "./tasks.js"
import { registerProjectTools } from "./projects.js"
import { registerMemberTools } from "./members.js"
import { registerWorkspaceTools } from "./workspaces.js"

/**
 * Registers all Meridian tools on a per-request McpServer instance.
 * Tools close over the request's DI scope and authenticated user, so every
 * call runs with exactly the caller's permissions. Write tools are omitted
 * entirely for read-only API tokens (they don't appear in tools/list).
 */
export function registerTools(server: McpServer, ctx: McpToolContext): void {
  registerWorkspaceTools(server, ctx)
  registerProjectTools(server, ctx)
  registerMemberTools(server, ctx)
  registerTaskTools(server, ctx)
}
