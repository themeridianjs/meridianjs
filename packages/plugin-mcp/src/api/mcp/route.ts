import type { Response } from "express"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { authenticateBearer } from "@meridianjs/auth"
import { apiRateLimit } from "@meridianjs/framework"
import { registerTools } from "../../tools/index.js"

/**
 * MCP endpoint (Streamable HTTP, stateless).
 *
 * Auth accepts a personal access token ("mrd_..." — created at
 * /admin/api-tokens) or a session JWT on Authorization: Bearer. Method-level
 * scope enforcement is disabled here because all MCP traffic travels over
 * POST; read-only tokens instead get a reduced tool set (write tools are
 * never registered for them).
 */
export const middlewares = [apiRateLimit, authenticateBearer]

const SERVER_INFO = { name: "meridian", version: "1.0.0" }

const INSTRUCTIONS = [
  "Meridian project management tools.",
  "Typical flow: list_projects to find a project, list_project_statuses for its workflow columns,",
  "list_members for assignable user IDs, then create_task / update_task / add_comment.",
].join(" ")

export const POST = async (req: any, res: Response) => {
  // Stateless: a fresh server + transport per request. Tools close over
  // req.scope/req.user so each call runs as the authenticated caller.
  const server = new McpServer(SERVER_INFO, { instructions: INSTRUCTIONS })
  registerTools(server, { scope: req.scope, user: req.user })

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — no Mcp-Session-Id issued or required
    enableJsonResponse: true, // plain JSON responses; no SSE stream needed for tools-only use
  })
  res.on("close", () => {
    void transport.close()
    void server.close()
  })

  try {
    await server.connect(transport)
    // express.json() has already consumed the stream — the parsed body MUST
    // be passed through or the transport would hang re-reading the request.
    await transport.handleRequest(req, res, req.body)
  } catch {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      })
    }
  }
}

/** Stateless transport: no server-initiated SSE stream and no session to end. */
const methodNotAllowed = (_req: any, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed — this MCP server is stateless" },
    id: null,
  })
}

export const GET = methodNotAllowed
export const DELETE = methodNotAllowed
