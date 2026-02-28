import type { IModuleService, MeridianContainer } from "@meridianjs/types"
import type { ModelDefinition } from "./dml.js"

// Fields that must never be overwritten via the generated update* method.
// Includes prototype-pollution vectors and auto-managed columns.
const UPDATE_RESERVED = new Set([
  "id", "created_at", "updated_at", "deleted_at",
  "__proto__", "constructor", "prototype",
])

/**
 * Base class factory that auto-generates CRUD methods for each model.
 *
 * For a model named "Project", the following methods are generated:
 *   - listProjects(filters?, options?) → Promise<Project[]>
 *   - listAndCountProjects(filters?, options?) → Promise<[Project[], number]>
 *   - retrieveProject(id) → Promise<Project>
 *   - createProject(data) → Promise<Project>
 *   - updateProject(id, data) → Promise<Project>
 *   - deleteProject(id) → Promise<void>
 *   - softDeleteProject(id) → Promise<Project>
 *
 * @example
 * class ProjectModuleService extends MeridianService({ Project, Label }) {
 *   constructor(container: MeridianContainer) { super(container) }
 * }
 */
export function MeridianService(
  models: Record<string, ModelDefinition>
): new (container: MeridianContainer) => IModuleService {
  class BaseService implements IModuleService {
    [method: string]: any
    // Use private class field to avoid conflicting with the index signature
    readonly #container: MeridianContainer

    constructor(container: MeridianContainer) {
      this.#container = container
      const hasCustomMethod = (name: string) => typeof (this as any)[name] === "function"
      for (const [modelName, _modelDef] of Object.entries(models)) {
        const pluralName = `${modelName}s`
        const repoToken = `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}Repository`
        const capitalized = `${modelName.charAt(0).toUpperCase()}${modelName.slice(1)}`
        const capitalizedPlural = `${pluralName.charAt(0).toUpperCase()}${pluralName.slice(1)}`

        // list{Model}s(filters?, options?) → T[]
        // Excludes soft-deleted records by default; pass { deleted_at: { $ne: null } }
        // in filters to explicitly include them.
        const listMethod = `list${capitalizedPlural}`
        if (!hasCustomMethod(listMethod)) {
          this[listMethod] = async (
            filters: Record<string, unknown> = {},
            options: Record<string, unknown> = {}
          ) => {
            const repo = this.#container.resolve<Repository>(repoToken)
            return repo.find({ deleted_at: null, ...filters }, options)
          }
        }

        // listAndCount{Model}s(filters?, options?) → [T[], number]
        const listAndCountMethod = `listAndCount${capitalizedPlural}`
        if (!hasCustomMethod(listAndCountMethod)) {
          this[listAndCountMethod] = async (
            filters: Record<string, unknown> = {},
            options: Record<string, unknown> = {}
          ) => {
            const repo = this.#container.resolve<Repository>(repoToken)
            return repo.findAndCount({ deleted_at: null, ...filters }, options)
          }
        }

        // retrieve{Model}(id) → T
        const retrieveMethod = `retrieve${capitalized}`
        if (!hasCustomMethod(retrieveMethod)) {
          this[retrieveMethod] = async (id: string) => {
            const repo = this.#container.resolve<Repository>(repoToken)
            return repo.findOneOrFail({ id, deleted_at: null })
          }
        }

        // create{Model}(data) → T
        const createMethod = `create${capitalized}`
        if (!hasCustomMethod(createMethod)) {
          this[createMethod] = async (data: Record<string, unknown>) => {
            const repo = this.#container.resolve<Repository>(repoToken)
            const entity = repo.create(data)
            await repo.persistAndFlush(entity)
            return entity
          }
        }

        // update{Model}(id, data) → T
        const updateMethod = `update${capitalized}`
        if (!hasCustomMethod(updateMethod)) {
          this[updateMethod] = async (
            id: string,
            data: Record<string, unknown>
          ) => {
            const repo = this.#container.resolve<Repository>(repoToken)
            const entity = await repo.findOneOrFail({ id, deleted_at: null })
            const safe = Object.fromEntries(
              Object.entries(data).filter(([k]) => !UPDATE_RESERVED.has(k))
            )
            Object.assign(entity as object, safe)
            await repo.flush()
            return entity
          }
        }

        // delete{Model}(id) → void
        const deleteMethod = `delete${capitalized}`
        if (!hasCustomMethod(deleteMethod)) {
          this[deleteMethod] = async (id: string) => {
            const repo = this.#container.resolve<Repository>(repoToken)
            const entity = await repo.findOneOrFail({ id })
            await repo.removeAndFlush(entity)
          }
        }

        // softDelete{Model}(id) → T  (sets deleted_at)
        const softDeleteMethod = `softDelete${capitalized}`
        if (!hasCustomMethod(softDeleteMethod)) {
          this[softDeleteMethod] = async (id: string) => {
            const repo = this.#container.resolve<Repository>(repoToken)
            const entity = await repo.findOneOrFail({ id, deleted_at: null }) as any
            entity.deleted_at = new Date()
            await repo.flush()
            return entity
          }
        }
      }
    }
  }

  return BaseService as any
}

// Minimal repository interface expected by MeridianService
interface Repository {
  find(filters: object, options?: object): Promise<unknown[]>
  findAndCount(filters: object, options?: object): Promise<[unknown[], number]>
  findOneOrFail(filters: object): Promise<unknown>
  create(data: object): unknown
  persistAndFlush(entity: unknown): Promise<void>
  flush(): Promise<void>
  removeAndFlush(entity: unknown): Promise<void>
}
