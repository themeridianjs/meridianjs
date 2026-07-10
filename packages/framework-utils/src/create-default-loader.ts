import type { LoaderFn, MeridianContainer } from "@meridianjs/types"
import type { ModelDefinition } from "./dml.js"
import { dmlToEntitySchema, createModuleOrm, createRepository } from "./orm-utils.js"

interface MeridianConfigLike {
  projectConfig: { databaseUrl: string }
}

/** snake_case table name → camelCase repository token (e.g. time_log → timeLogRepository). */
function repoToken(tableName: string): string {
  const camel = tableName.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
  return `${camel}Repository`
}

/**
 * Builds a module's default loader from its DML models — replaces the
 * near-identical boilerplate every module previously duplicated (resolve
 * config → createModuleOrm → register one repository per model).
 *
 * Each model is registered as `${camelCase(tableName)}Repository`, and the ORM
 * itself as `${ormKey}` (e.g. "issueOrm").
 *
 * @example
 * export default createDefaultLoader({
 *   models: [IssueModel, CommentModel, TimeLogModel],
 *   ormKey: "issueOrm",
 * })
 */
export function createDefaultLoader(opts: {
  models: ModelDefinition[]
  ormKey: string
}): LoaderFn {
  const entitySchemas = opts.models.map(dmlToEntitySchema)

  return async function defaultLoader({ container }: { container: MeridianContainer }) {
    const config = container.resolve<MeridianConfigLike>("config")
    const orm = await createModuleOrm(entitySchemas, config.projectConfig.databaseUrl)

    const registrations: Record<string, unknown> = { [opts.ormKey]: orm }
    for (const model of opts.models) {
      registrations[repoToken(model.tableName)] = createRepository(orm, model.tableName)
    }
    container.register(registrations)
  }
}
