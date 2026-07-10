import { EntitySchema } from "@mikro-orm/core"
import type { MikroORM, EntityManager } from "@mikro-orm/core"
import { getContextEm } from "./orm-context.js"
import {
  ModelDefinition,
  IdProperty,
  TextProperty,
  BooleanProperty,
  NumberProperty,
  DateProperty,
  JsonProperty,
  EnumProperty,
} from "./dml.js"

/**
 * Converts a DML ModelDefinition to a MikroORM EntitySchema.
 *
 * Automatically adds `created_at`, `updated_at`, and `deleted_at` timestamp
 * columns to every entity.
 */
const RESERVED_TIMESTAMP_KEYS = ["created_at", "updated_at", "deleted_at"]

export function dmlToEntitySchema(def: ModelDefinition): EntitySchema {
  // Fail fast if the model schema tries to define a framework-managed column
  for (const key of RESERVED_TIMESTAMP_KEYS) {
    if (key in def.schema) {
      throw new Error(
        `Model "${def.tableName}" defines reserved column "${key}". ` +
        `Meridian automatically manages created_at, updated_at, and deleted_at.`
      )
    }
  }

  const properties: Record<string, any> = {}

  for (const [key, prop] of Object.entries(def.schema)) {
    if (prop instanceof IdProperty) {
      properties[key] = {
        type: "uuid",
        primary: prop._primaryKey,
        defaultRaw: "gen_random_uuid()",
        nullable: false,
      }
    } else if (prop instanceof TextProperty) {
      properties[key] = {
        type: "text",
        nullable: prop._nullable,
        ...(prop._default !== undefined ? { default: prop._default } : {}),
      }
    } else if (prop instanceof BooleanProperty) {
      properties[key] = {
        type: "boolean",
        nullable: false,
        ...(prop._default !== undefined ? { default: prop._default } : {}),
      }
    } else if (prop instanceof NumberProperty) {
      properties[key] = {
        type: "integer",
        nullable: prop._nullable,
        ...(prop._default !== undefined ? { default: prop._default } : {}),
      }
    } else if (prop instanceof DateProperty) {
      properties[key] = {
        type: "Date",
        nullable: prop._nullable,
      }
    } else if (prop instanceof JsonProperty) {
      properties[key] = {
        type: "json",
        nullable: prop._nullable,
      }
    } else if (prop instanceof EnumProperty) {
      properties[key] = {
        type: "string",
        nullable: prop._nullable,
        enum: true,
        items: prop._values,
        ...(prop._default !== undefined ? { default: prop._default } : {}),
      }
    }
  }

  // Auto-add standard timestamp columns
  properties.created_at = {
    type: "Date",
    nullable: false,
    onCreate: () => new Date(),
  }
  properties.updated_at = {
    type: "Date",
    nullable: false,
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  }
  properties.deleted_at = {
    type: "Date",
    nullable: true,
  }

  // MikroORM honors uniqueness only via the `uniques` array — `unique: true`
  // inside `indexes` is silently ignored and produces a plain index.
  const allIndexes = def.indexes ?? []
  const indexes = allIndexes
    .filter((idx) => !idx.unique)
    .map((idx) => ({
      ...(idx.name ? { name: idx.name } : {}),
      properties: idx.columns as any,
    }))
  const uniques = allIndexes
    .filter((idx) => idx.unique)
    .map((idx) => ({
      ...(idx.name ? { name: idx.name } : {}),
      properties: idx.columns as any,
    }))

  return new EntitySchema({
    name: def.tableName,
    tableName: def.tableName,
    properties,
    ...(indexes.length > 0 ? { indexes } : {}),
    ...(uniques.length > 0 ? { uniques } : {}),
  })
}

/**
 * Wraps a module's MikroORM instance into the Repository interface expected
 * by MeridianService's auto-generated CRUD methods.
 *
 * Every method resolves the *current context* EntityManager at call time
 * (see orm-context.ts) rather than closing over one boot-time fork, so
 * concurrent requests get isolated identity maps and unit-of-work state.
 *
 * The `entityName` is the DML model's tableName (e.g. "user", "workspace").
 * The resulting object is registered in the module container as `${entityName}Repository`.
 *
 * @param orm - the module's MikroORM instance (previously an EntityManager fork).
 *   The legacy (em, entityName) signature is still accepted for one release:
 *   an EntityManager's own `.getRepository` is used directly in that case.
 */
export function createRepository(ormOrEm: MikroORM | EntityManager, entityName: string): MeridianRepository {
  // Back-compat: an EntityManager was passed (pre-context callers).
  const legacyEm = isEntityManager(ormOrEm) ? (ormOrEm as EntityManager) : null
  const orm = legacyEm ? null : (ormOrEm as MikroORM)
  const em = () => (legacyEm ? legacyEm : getContextEm(orm!))

  return {
    async find(filters: object, options: object = {}) {
      return em().getRepository(entityName).find(filters as any, options as any)
    },
    async findAndCount(filters: object, options: object = {}) {
      // Strip pagination keys from count query so the total reflects all matching
      // records, not just the current page, while still applying any other options
      // (e.g. extra where conditions passed via options).
      const { limit, offset, ...countOptions } = options as any
      const repo = em().getRepository(entityName)
      const [data, count] = await Promise.all([
        repo.find(filters as any, options as any),
        repo.count(filters as any, countOptions),
      ])
      return [data, count] as [unknown[], number]
    },
    async findOne(filters: object) {
      return em().getRepository(entityName).findOne(filters as any)
    },
    async findOneOrFail(filters: object) {
      return em().getRepository(entityName).findOneOrFail(filters as any)
    },
    create(data: object) {
      return em().getRepository(entityName).create(data as any)
    },
    async persistAndFlush(entity: unknown) {
      await em().persistAndFlush(entity as any)
    },
    async flush() {
      await em().flush()
    },
    async removeAndFlush(entity: unknown) {
      await em().removeAndFlush(entity as any)
    },
    async nativeUpdate(filters: object, data: object) {
      // Bypasses the identity map — single atomic UPDATE, returns affected rows.
      return em().nativeUpdate(entityName, filters as any, data as any)
    },
    clear() {
      em().clear()
    },
  }
}

function isEntityManager(x: any): boolean {
  // A MikroORM instance exposes `.em`; an EntityManager does not.
  return typeof x?.getRepository === "function" && typeof x?.fork === "function" && !("em" in x)
}

export interface MeridianRepository {
  find(filters: object, options?: object): Promise<unknown[]>
  findAndCount(filters: object, options?: object): Promise<[unknown[], number]>
  findOne(filters: object): Promise<unknown | null>
  findOneOrFail(filters: object): Promise<unknown>
  create(data: object): unknown
  persistAndFlush(entity: unknown): Promise<void>
  flush(): Promise<void>
  removeAndFlush(entity: unknown): Promise<void>
  /** Atomic conditional UPDATE (bypasses the identity map); returns affected row count. */
  nativeUpdate(filters: object, data: object): Promise<number>
  /** Clears the current EM's identity map — use between retry attempts. */
  clear(): void
}

/**
 * One shared MikroORM instance (and connection pool) per database URL.
 * Previously each of the ~14 modules opened its own pool, multiplying
 * connections and risking Postgres `max_connections` exhaustion.
 */
const ormCache = new Map<string, MikroORM>()
const registeredTables = new Map<string, Set<string>>()

/**
 * Returns the shared MikroORM instance for a module's entities, creating it on
 * first use and registering additional module entities into it thereafter.
 *
 * Schema auto-sync (safe mode — only adds, never drops) is opt-in: pass
 * `{ sync: true }` or set MERIDIAN_DB_SYNC=1. It is NEVER on by default — use
 * migrations in production; running DDL at every boot is unsafe under load.
 *
 * @param entitySchemas - MikroORM EntitySchema objects for this module's models
 * @param databaseUrl - PostgreSQL connection URL
 * @param options.sync - auto-sync schema (default: false; honors MERIDIAN_DB_SYNC)
 */
export async function createModuleOrm(
  entitySchemas: EntitySchema[],
  databaseUrl: string,
  options: { sync?: boolean; debug?: boolean; logger?: (msg: string) => void } = {}
): Promise<MikroORM> {
  // Lazy import to avoid making @mikro-orm a framework-utils peer dep
  const { MikroORM } = await import("@mikro-orm/core")
  const { PostgreSqlDriver } = await import("@mikro-orm/postgresql")

  const tableSet = registeredTables.get(databaseUrl) ?? new Set<string>()
  registeredTables.set(databaseUrl, tableSet)

  // Guard: table names are the metadata keys and must be globally unique so
  // modules don't clobber each other's entity definitions in the shared store.
  for (const schema of entitySchemas) {
    const name = (schema.meta?.className ?? (schema as any).name) as string
    if (tableSet.has(name)) {
      throw new Error(
        `Entity "${name}" is already registered on the ORM for this database. ` +
        `Table names must be unique across modules.`
      )
    }
  }

  let orm = ormCache.get(databaseUrl)
  if (!orm) {
    orm = await MikroORM.init({
      entities: entitySchemas,
      clientUrl: databaseUrl,
      driver: PostgreSqlDriver,
      debug: options.debug ?? false,
    })
    ormCache.set(databaseUrl, orm)
  } else {
    // Additive: register this module's entities into the existing instance.
    orm.discoverEntity(entitySchemas)
  }

  for (const schema of entitySchemas) {
    tableSet.add((schema.meta?.className ?? (schema as any).name) as string)
  }

  const shouldSync =
    options.sync ?? (process.env.MERIDIAN_DB_SYNC === "1" || process.env.MERIDIAN_DB_SYNC === "true")
  if (shouldSync) {
    options.logger?.(
      `[meridian] MERIDIAN_DB_SYNC is on — running safe schema sync (additive DDL). ` +
      `Do not use this in production; prefer migrations.`
    )
    const generator = orm.getSchemaGenerator()
    await generator.updateSchema({ safe: true })
  }

  return orm
}

/** Closes and clears all cached ORM instances (call on shutdown). */
export async function closeAllOrms(): Promise<void> {
  await Promise.all([...ormCache.values()].map((orm) => orm.close(true).catch(() => {})))
  ormCache.clear()
  registeredTables.clear()
}

/** Clears the ORM cache without closing (test isolation only). */
export function resetOrmCache(): void {
  ormCache.clear()
  registeredTables.clear()
}
