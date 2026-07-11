import { fileURLToPath } from "node:url"
import path from "node:path"
import type { PluginRegistrationContext } from "@meridianjs/types"

/**
 * The directory of this compiled file.
 *
 * In production (dist/index.js):      points to <package>/dist/
 * In development (src/index.ts tsx):  points to <package>/src/
 *
 * The Meridian plugin-loader uses this to auto-scan the api/ sub-directory,
 * which serves the MCP endpoint at POST /mcp.
 */
export const pluginRoot: string = path.dirname(fileURLToPath(import.meta.url))

/**
 * Plugin registration function. The MCP server has no module of its own —
 * it authenticates via @meridianjs/api-token (a core module) and calls the
 * existing domain services/workflows through the request scope.
 */
export default async function register(_ctx: PluginRegistrationContext): Promise<void> {
  // Nothing to register — routes are auto-scanned from pluginRoot/api.
}
