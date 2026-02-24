import path from "node:path"
import fs from "node:fs/promises"
import { pathToFileURL } from "node:url"
import { createRequire } from "node:module"
import { loadModules } from "./module-loader.js"
import { loadRoutes } from "./route-loader.js"
import { loadSubscribers } from "./subscriber-loader.js"
import { loadJobs } from "./job-loader.js"
import { loadLinks } from "./link-loader.js"
import type {
  PluginConfig,
  MeridianContainer,
  ILogger,
  PluginRegistrationContext,
  ModuleConfig,
} from "@meridianjs/types"

/**
 * Loads plugins declared in config.plugins[].
 *
 * Plugin package contract:
 *  - Default export: async register(ctx: PluginRegistrationContext) — optional
 *  - Named export `pluginRoot`: string — path to the directory containing
 *    the plugin's api/, subscribers/, jobs/ sub-directories.
 *    In production (compiled): points to the plugin's dist/ dir.
 *    In development (tsx): points to the plugin's src/ dir.
 *
 * Auto-scan order when `pluginRoot` is NOT exported:
 *  1. <packageRoot>/dist/   — built output
 *  2. <packageRoot>/src/    — TypeScript source (dev with tsx)
 *  3. <resolvedPath>/       — local path plugins
 *
 * Supported resolve values in config:
 *  - npm package name: "@my-org/meridian-github"
 *  - relative local path: "./src/plugins/my-plugin"
 *  - absolute path: "/absolute/path/to/plugin"
 */
export async function loadPlugins(
  container: MeridianContainer,
  plugins: PluginConfig[],
  rootDir: string
): Promise<void> {
  const logger = container.resolve<ILogger>("logger")

  for (const plugin of plugins) {
    logger.info(`Loading plugin: ${plugin.resolve}`)

    // ── 1. Resolve import path ──────────────────────────────────────────────
    const isLocalPath = plugin.resolve.startsWith(".") || path.isAbsolute(plugin.resolve)
    const importPath = isLocalPath
      ? pathToFileURL(path.resolve(rootDir, plugin.resolve)).href
      : plugin.resolve

    let pluginMod: Record<string, unknown>
    try {
      pluginMod = await import(importPath)
    } catch (err: any) {
      logger.error(`Failed to load plugin "${plugin.resolve}": ${err.message}`)
      continue
    }

    // ── 2. Determine scan root ──────────────────────────────────────────────
    // Prefer the plugin's own exported `pluginRoot` (points to its compiled dir).
    // Fall back to resolving the npm package root and probing dist/ then src/.
    let scanRoot: string | null = null

    if (pluginMod.pluginRoot && typeof pluginMod.pluginRoot === "string") {
      scanRoot = pluginMod.pluginRoot
    } else if (isLocalPath) {
      const resolvedPath = path.resolve(rootDir, plugin.resolve)
      try {
        const stat = await fs.stat(resolvedPath)
        scanRoot = stat.isDirectory() ? resolvedPath : path.dirname(resolvedPath)
      } catch {
        scanRoot = path.dirname(resolvedPath)
      }
    } else {
      // npm package — resolve its installed path via require from the project root
      scanRoot = resolveNpmPackageRoot(plugin.resolve, rootDir)
    }

    // ── 3. Build registration context ──────────────────────────────────────
    const ctx: PluginRegistrationContext = {
      container,
      pluginOptions: plugin.options ?? {},
      addModule: async (moduleConfig: ModuleConfig) => {
        await loadModules(container, [moduleConfig], scanRoot ?? rootDir)
      },
    }

    // ── 4. Call register() ──────────────────────────────────────────────────
    if (typeof pluginMod.default === "function") {
      try {
        await (pluginMod.default as Function)(ctx)
      } catch (err: any) {
        logger.error(`Plugin register() failed for "${plugin.resolve}": ${err.message}`)
        continue
      }
    }

    // ── 5. Auto-scan routes / subscribers / jobs ────────────────────────────
    if (scanRoot) {
      await autoScanPlugin(scanRoot, container, logger)
    }

    logger.info(`Plugin loaded: ${plugin.resolve}`)
  }
}

/**
 * Tries to find a plugin's scannable directory.
 * Checks candidates in order: scanRoot directly, then dist/, then src/.
 */
async function autoScanPlugin(
  scanRoot: string,
  container: MeridianContainer,
  logger: ILogger
): Promise<void> {
  // server may not be registered during db:migrate — only load routes when available
  let server: any = null
  try {
    server = container.resolve<any>("server")
  } catch {
    // running in migration/schema-only mode — skip route loading
  }

  const candidates = [
    scanRoot,                          // pluginRoot already points to compiled dir
    path.join(scanRoot, "dist"),       // package root → try dist/ first
    path.join(scanRoot, "src"),        // package root → try src/ (tsx dev mode)
  ]

  for (const candidate of candidates) {
    const apiDir = path.join(candidate, "api")
    try {
      await fs.access(apiDir)
      // Found a valid candidate — scan all sub-dirs in parallel
      await Promise.all([
        server ? loadRoutes(server, container, apiDir) : Promise.resolve(),
        loadSubscribers(container, path.join(candidate, "subscribers")),
        loadJobs(container, path.join(candidate, "jobs")),
        loadLinks(container, path.join(candidate, "links")),
      ])
      logger.debug(`Plugin auto-scanned from: ${candidate}`)
      return
    } catch {
      // This candidate doesn't have an api/ dir, try the next one
    }
  }

  // No api/ dir found — that's fine, plugin may only use register()
  logger.debug(`No api/ directory found for plugin scan root: ${scanRoot}`)
}

/**
 * Resolve an npm package's root directory from the project's node_modules.
 * Uses createRequire from the project root to respect the local resolution order.
 */
function resolveNpmPackageRoot(packageName: string, fromDir: string): string | null {
  try {
    // createRequire needs a file path, not a directory
    const require = createRequire(path.join(fromDir, "synthetic.cjs"))
    const pkgJsonPath = require.resolve(`${packageName}/package.json`)
    return path.dirname(pkgJsonPath)
  } catch {
    // Package might not export package.json — try resolving the main entry
    try {
      const require = createRequire(path.join(fromDir, "synthetic.cjs"))
      const mainPath = require.resolve(packageName)
      // Walk up to find the package root (where package.json lives)
      let dir = path.dirname(mainPath)
      while (dir !== path.dirname(dir)) {
        try {
          require.resolve(path.join(dir, "package.json"))
          return dir
        } catch {
          dir = path.dirname(dir)
        }
      }
    } catch {
      // ignore
    }
    return null
  }
}
