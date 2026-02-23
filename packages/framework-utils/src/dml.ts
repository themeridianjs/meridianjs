/**
 * Data Model Language (DML) — fluent API for defining Meridian data models.
 *
 * Each model definition is later converted to a database schema by the module loader.
 * The actual ORM entity class is generated at runtime from this specification.
 *
 * @example
 * const Project = model.define("project", {
 *   id: model.id().primaryKey(),
 *   name: model.text(),
 *   visibility: model.enum(["private", "public", "workspace"]),
 *   description: model.text().nullable(),
 * })
 */

// ─────────────────────────────────────────────────────────────────────────────
// Property Types
// ─────────────────────────────────────────────────────────────────────────────

export class IdProperty {
  readonly _type = "id" as const
  _primaryKey = false

  primaryKey(): this {
    this._primaryKey = true
    return this
  }
}

export class TextProperty {
  readonly _type = "text" as const
  _nullable = false
  _default?: string

  nullable(): this {
    this._nullable = true
    return this
  }

  default(val: string): this {
    this._default = val
    return this
  }
}

export class BooleanProperty {
  readonly _type = "boolean" as const
  _default?: boolean

  default(val: boolean): this {
    this._default = val
    return this
  }
}

export class NumberProperty {
  readonly _type = "number" as const
  _nullable = false
  _default?: number

  nullable(): this {
    this._nullable = true
    return this
  }

  default(val: number): this {
    this._default = val
    return this
  }
}

export class DateProperty {
  readonly _type = "date" as const
  _nullable = false

  nullable(): this {
    this._nullable = true
    return this
  }
}

export class JsonProperty {
  readonly _type = "json" as const
  _nullable = false

  nullable(): this {
    this._nullable = true
    return this
  }
}

export class EnumProperty<T extends string> {
  readonly _type = "enum" as const

  constructor(public readonly _values: T[]) {}

  _nullable = false
  _default?: T

  nullable(): this {
    this._nullable = true
    return this
  }

  default(val: T): this {
    this._default = val
    return this
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Definition
// ─────────────────────────────────────────────────────────────────────────────

export type PropertyType =
  | IdProperty
  | TextProperty
  | BooleanProperty
  | NumberProperty
  | DateProperty
  | JsonProperty
  | EnumProperty<string>

export type ModelSchema = Record<string, PropertyType>

export interface IndexDefinition {
  /** Column names that form the index. */
  columns: string[]
  /** Whether this is a unique index. Defaults to false. */
  unique?: boolean
  /** Optional explicit index name. MikroORM will auto-generate one if omitted. */
  name?: string
}

export class ModelDefinition<Schema extends ModelSchema = ModelSchema> {
  constructor(
    public readonly tableName: string,
    public readonly schema: Schema,
    public readonly indexes: IndexDefinition[] = []
  ) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export const model = {
  /**
   * Define a new data model. The table name should be snake_case singular.
   * Optionally pass index definitions as the third argument.
   */
  define<Schema extends ModelSchema>(
    tableName: string,
    schema: Schema,
    indexes?: IndexDefinition[]
  ): ModelDefinition<Schema> {
    return new ModelDefinition(tableName, schema, indexes ?? [])
  },

  /** UUID primary key field */
  id: (): IdProperty => new IdProperty(),

  /** Variable-length text / varchar */
  text: (): TextProperty => new TextProperty(),

  /** Boolean true/false */
  boolean: (): BooleanProperty => new BooleanProperty(),

  /** Integer or float */
  number: (): NumberProperty => new NumberProperty(),

  /** Timestamp with timezone */
  date: (): DateProperty => new DateProperty(),

  /** JSONB column */
  json: (): JsonProperty => new JsonProperty(),

  /** Enum column — values are enforced at application level */
  enum: <T extends string>(values: T[]): EnumProperty<T> => new EnumProperty(values),
}

// ─────────────────────────────────────────────────────────────────────────────
// Type helpers — infer TypeScript type from a ModelDefinition
// ─────────────────────────────────────────────────────────────────────────────

type InferPropertyType<P extends PropertyType> =
  P extends IdProperty ? string :
  P extends TextProperty ? (P["_nullable"] extends true ? string | null : string) :
  P extends BooleanProperty ? boolean :
  P extends NumberProperty ? (P["_nullable"] extends true ? number | null : number) :
  P extends DateProperty ? (P["_nullable"] extends true ? Date | null : Date) :
  P extends JsonProperty ? (P["_nullable"] extends true ? unknown | null : unknown) :
  P extends EnumProperty<infer T> ? T :
  never

export type InferModel<M extends ModelDefinition> =
  M extends ModelDefinition<infer Schema>
    ? { [K in keyof Schema]: InferPropertyType<Schema[K]> } & {
        created_at: Date
        updated_at: Date
        deleted_at: Date | null
      }
    : never
