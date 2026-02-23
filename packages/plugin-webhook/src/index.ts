import { fileURLToPath } from "node:url"
import path from "node:path"
import type { PluginRegistrationContext } from "@meridian/types"
import { WebhookModule } from "./module/index.js"

/**
 * The directory of this compiled file.
 *
 * In production (dist/index.js):      points to <package>/dist/
 * In development (src/index.ts tsx):  points to <package>/src/
 *
 * The Meridian plugin-loader uses this to auto-scan api/, subscribers/, jobs/
 * sub-directories relative to this path.
 */
export const pluginRoot: string = path.dirname(fileURLToPath(import.meta.url))

/**
 * Plugin registration function.
 * Called by the framework during bootstrap before route/subscriber auto-scan.
 */
export default async function register(ctx: PluginRegistrationContext): Promise<void> {
  // Register the WebhookEvent module into the DI container
  await ctx.addModule({ resolve: WebhookModule })
}

// Re-export types for consumers
export type { WebhookModuleService } from "./module/service.js"
export { WebhookModule } from "./module/index.js"
