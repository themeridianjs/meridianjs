import path from "node:path"
import { pathToFileURL } from "node:url"
import { loadModules } from "./module-loader.js"
import { loadRoutes } from "./route-loader.js"
import { loadSubscribers } from "./subscriber-loader.js"
import { loadJobs } from "./job-loader.js"
import type {
  PluginConfig,
  MeridianContainer,
  ILogger,
  PluginRegistrationContext,
  ModuleConfig,
} from "@meridian/types"

/**
 * Loads plugins declared in config.plugins[].
 *
 * Each plugin is an npm package that:
 *   1. Exports a default register(ctx) async function
 *   2. Optionally has src/api/, src/subscribers/, src/jobs/ directories
 *
 * The plugin package must have a `meridianPluginRoot` export or follow
 * the standard npm package layout with a package.json at its root.
 */
export async function loadPlugins(
  container: MeridianContainer,
  plugins: PluginConfig[],
  _rootDir: string
): Promise<void> {
  const logger = container.resolve<ILogger>("logger")

  for (const plugin of plugins) {
    logger.info(`Loading plugin: ${plugin.resolve}`)

    let pluginMod: Record<string, unknown>
    let pluginRoot: string

    try {
      // Dynamic import of the plugin package
      pluginMod = await import(plugin.resolve)

      // Plugins should export their root directory for auto-scanning
      pluginRoot = (pluginMod.pluginRoot as string | undefined) ?? plugin.resolve
    } catch (err: any) {
      logger.error(`Failed to load plugin "${plugin.resolve}": ${err.message}`)
      continue
    }

    const ctx: PluginRegistrationContext = {
      container,
      pluginOptions: plugin.options ?? {},
      addModule: async (moduleConfig: ModuleConfig) => {
        await loadModules(container, [moduleConfig], pluginRoot)
      },
    }

    // Call the plugin's register function if present
    if (typeof pluginMod.default === "function") {
      await (pluginMod.default as Function)(ctx)
    }

    // Auto-scan the plugin's src/ directories if pluginRoot is a filesystem path
    if (path.isAbsolute(pluginRoot)) {
      const srcDir = path.join(pluginRoot, "src")
      const server = container.resolve<any>("server")

      await Promise.all([
        loadRoutes(server, container, path.join(srcDir, "api")),
        loadSubscribers(container, path.join(srcDir, "subscribers")),
        loadJobs(container, path.join(srcDir, "jobs")),
      ])
    }

    logger.info(`Plugin loaded: ${plugin.resolve}`)
  }
}
