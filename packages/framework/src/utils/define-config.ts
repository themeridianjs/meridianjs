import type { MeridianConfig } from "@meridian/types"

/**
 * Type-safe helper for defining a Meridian configuration.
 * Returns the config unchanged — purely for IDE autocomplete and type checking.
 *
 * @example
 * // meridian.config.ts
 * import { defineConfig } from "@meridian/framework"
 *
 * export default defineConfig({
 *   projectConfig: {
 *     databaseUrl: process.env.DATABASE_URL!,
 *     jwtSecret: process.env.JWT_SECRET!,
 *   },
 *   modules: [
 *     { resolve: "@meridian/user" },
 *     { resolve: "@meridian/project" },
 *   ],
 * })
 */
export function defineConfig(config: MeridianConfig): MeridianConfig {
  return config
}
