import { EntitySchema } from "@mikro-orm/core"
import type { MikroORM, EntityManager } from "@mikro-orm/core"
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
export function dmlToEntitySchema(def: ModelDefinition): EntitySchema {
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

  return new EntitySchema({
    name: def.tableName,
    tableName: def.tableName,
    properties,
  })
}

/**
 * Wraps a MikroORM EntityManager into the Repository interface expected
 * by MeridianService's auto-generated CRUD methods.
 *
 * The `entityName` is the DML model's tableName (e.g. "user", "workspace").
 * The resulting object is registered in the module container as `${entityName}Repository`.
 */
export function createRepository(em: EntityManager, entityName: string): MeridianRepository {
  const repo = em.getRepository(entityName)

  return {
    async find(filters: object, options: object = {}) {
      return repo.find(filters as any, options as any)
    },
    async findAndCount(filters: object, options: object = {}) {
      const [data, count] = await Promise.all([
        repo.find(filters as any, options as any),
        repo.count(filters as any),
      ])
      return [data, count] as [unknown[], number]
    },
    async findOneOrFail(filters: object) {
      return repo.findOneOrFail(filters as any)
    },
    create(data: object) {
      return repo.create(data as any)
    },
    async persistAndFlush(entity: unknown) {
      await em.persistAndFlush(entity as any)
    },
    async flush() {
      await em.flush()
    },
    async removeAndFlush(entity: unknown) {
      await em.removeAndFlush(entity as any)
    },
  }
}

export interface MeridianRepository {
  find(filters: object, options?: object): Promise<unknown[]>
  findAndCount(filters: object, options?: object): Promise<[unknown[], number]>
  findOneOrFail(filters: object): Promise<unknown>
  create(data: object): unknown
  persistAndFlush(entity: unknown): Promise<void>
  flush(): Promise<void>
  removeAndFlush(entity: unknown): Promise<void>
}

/**
 * Creates a MikroORM instance for a module's set of entities.
 *
 * In development (NODE_ENV !== "production"), schema is automatically
 * synced to the database (safe mode — only adds, never drops).
 *
 * @param entitySchemas - MikroORM EntitySchema objects for this module's models
 * @param databaseUrl - PostgreSQL connection URL
 * @param sync - auto-sync schema (default: true in development)
 */
export async function createModuleOrm(
  entitySchemas: EntitySchema[],
  databaseUrl: string,
  options: { sync?: boolean; debug?: boolean } = {}
): Promise<MikroORM> {
  // Lazy import to avoid making @mikro-orm a framework-utils peer dep
  const { MikroORM } = await import("@mikro-orm/core")
  const { PostgreSqlDriver } = await import("@mikro-orm/postgresql")

  const orm = await MikroORM.init({
    entities: entitySchemas,
    clientUrl: databaseUrl,
    driver: PostgreSqlDriver,
    debug: options.debug ?? false,
  })

  const shouldSync = options.sync ?? process.env.NODE_ENV !== "production"
  if (shouldSync) {
    const generator = orm.getSchemaGenerator()
    await generator.updateSchema({ safe: true })
  }

  return orm
}
