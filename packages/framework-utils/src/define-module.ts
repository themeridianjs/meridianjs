import type { ModuleDefinition } from "@meridian/types"

/**
 * Declares a Meridian module.
 *
 * @example
 * export default Module("projectModuleService", {
 *   service: ProjectModuleService,
 *   models: [Project, Label],
 *   loaders: [defaultLoader],
 *   linkable: { project: { tableName: "project", primaryKey: "id" } },
 * })
 */
export function Module(
  key: string,
  definition: Omit<ModuleDefinition, "key">
): ModuleDefinition {
  return { key, ...definition }
}
