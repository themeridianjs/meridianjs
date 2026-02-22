import path from "node:path"
import { pathToFileURL } from "node:url"
import type { MeridianConfig } from "@meridian/types"

/**
 * Loads and validates the user's meridian.config.ts (or .js / .mjs) file.
 * Supports both ESM and CJS projects.
 */
export async function loadConfig(
  rootDir: string,
  configPath?: string
): Promise<MeridianConfig> {
  const resolvedPath = configPath ?? path.join(rootDir, "meridian.config.ts")

  // Try ts, js, mjs, cjs extensions in order
  const candidates = configPath
    ? [resolvedPath]
    : [
        path.join(rootDir, "meridian.config.ts"),
        path.join(rootDir, "meridian.config.mts"),
        path.join(rootDir, "meridian.config.js"),
        path.join(rootDir, "meridian.config.mjs"),
        path.join(rootDir, "meridian.config.cjs"),
      ]

  let config: MeridianConfig | null = null

  for (const candidate of candidates) {
    try {
      // Use dynamic import with file URL for cross-platform compatibility
      const mod = await import(pathToFileURL(candidate).href)
      const raw = mod.default ?? mod
      config = raw as MeridianConfig
      break
    } catch (err: any) {
      if (err.code !== "ERR_MODULE_NOT_FOUND" && err.code !== "MODULE_NOT_FOUND") {
        throw new Error(
          `Failed to load Meridian config from "${candidate}": ${err.message}`
        )
      }
    }
  }

  if (!config) {
    throw new Error(
      `Could not find meridian.config.ts in "${rootDir}". ` +
      `Make sure you have a meridian.config.ts file in your project root.`
    )
  }

  validateConfig(config)
  return config
}

function validateConfig(config: MeridianConfig): void {
  if (!config.projectConfig) {
    throw new Error("meridian.config: missing required field 'projectConfig'")
  }
  if (!config.projectConfig.databaseUrl) {
    throw new Error("meridian.config.projectConfig: missing required field 'databaseUrl'")
  }
  if (!config.projectConfig.jwtSecret) {
    throw new Error("meridian.config.projectConfig: missing required field 'jwtSecret'")
  }
}
