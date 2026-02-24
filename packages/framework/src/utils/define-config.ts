import type { MeridianConfig } from "@meridianjs/types"

/**
 * Type-safe helper for defining a Meridian configuration.
 * Returns the config unchanged — purely for IDE autocomplete and type checking.
 *
 * @example
 * // meridian.config.ts
 * import { defineConfig } from "@meridianjs/framework"
 *
 * export default defineConfig({
 *   projectConfig: {
 *     databaseUrl: process.env.DATABASE_URL!,
 *     jwtSecret: process.env.JWT_SECRET!,
 *   },
 *   modules: [
 *     { resolve: "@meridianjs/user" },
 *     { resolve: "@meridianjs/project" },
 *   ],
 * })
 */
export function defineConfig(config: MeridianConfig): MeridianConfig {
  return config
}
