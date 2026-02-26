import { fileURLToPath } from "node:url"
import path from "node:path"
import type { PluginRegistrationContext } from "@meridianjs/types"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Tells the Meridian plugin loader where to find this package's
 * api/, links/, subscribers/, and jobs/ directories.
 */
export const pluginRoot = path.resolve(__dirname, "..")

/**
 * Core modules that every Meridian application requires.
 * Auto-loaded when @meridianjs/meridian is registered as a plugin,
 * so users don't need to list them individually in meridian.config.ts.
 *
 * Only truly optional modules (event bus, job queue, custom modules)
 * belong in config.modules[].
 */
const CORE_MODULES = [
  "@meridianjs/user",
  "@meridianjs/workspace",
  "@meridianjs/auth",
  "@meridianjs/project",
  "@meridianjs/issue",
  "@meridianjs/sprint",
  "@meridianjs/activity",
  "@meridianjs/notification",
  "@meridianjs/invitation",
  "@meridianjs/workspace-member",
  "@meridianjs/team-member",
  "@meridianjs/project-member",
  "@meridianjs/app-role",
]

export default async function register(ctx: PluginRegistrationContext): Promise<void> {
  for (const resolve of CORE_MODULES) {
    await ctx.addModule({ resolve })
  }
}
