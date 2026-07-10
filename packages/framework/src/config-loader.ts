import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import type { MeridianConfig } from "@meridianjs/types"

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

  // Decide "config not found" by checking the candidate files themselves —
  // filtering import errors by ERR_MODULE_NOT_FOUND would also swallow a
  // missing transitive import *inside* the config and misreport it as absent.
  const existing = candidates.find((candidate) => fs.existsSync(candidate))

  if (!existing) {
    throw new Error(
      `Could not find meridian.config.ts in "${rootDir}". ` +
      `Make sure you have a meridian.config.ts file in your project root.`
    )
  }

  let config: MeridianConfig
  try {
    // Use dynamic import with file URL for cross-platform compatibility
    const mod = await import(pathToFileURL(existing).href)
    const raw = mod.default ?? mod
    config = raw as MeridianConfig
  } catch (err: any) {
    throw new Error(
      `Failed to load Meridian config from "${existing}": ${err.message}`,
      { cause: err }
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
