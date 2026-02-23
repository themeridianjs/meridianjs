import { describe, it, expect } from "vitest"
import { model, ModelDefinition } from "./dml.js"

describe("model.define()", () => {
  it("stores tableName and schema", () => {
    const MyModel = model.define("my_table", {
      id: model.id().primaryKey(),
      name: model.text(),
    })

    expect(MyModel).toBeInstanceOf(ModelDefinition)
    expect(MyModel.tableName).toBe("my_table")
    expect(MyModel.schema).toHaveProperty("id")
    expect(MyModel.schema).toHaveProperty("name")
  })

  it("defaults indexes to an empty array when not provided", () => {
    const MyModel = model.define("my_table", { id: model.id().primaryKey() })
    expect(MyModel.indexes).toEqual([])
  })

  it("stores provided indexes", () => {
    const MyModel = model.define("my_table", {
      id: model.id().primaryKey(),
      workspace_id: model.text(),
      status: model.text(),
    }, [
      { columns: ["workspace_id"] },
      { columns: ["workspace_id", "status"], unique: false },
    ])

    expect(MyModel.indexes).toHaveLength(2)
    expect(MyModel.indexes[0]).toEqual({ columns: ["workspace_id"] })
    expect(MyModel.indexes[1]).toEqual({ columns: ["workspace_id", "status"], unique: false })
  })

  it("stores unique index flag", () => {
    const MyModel = model.define("my_table", {
      id: model.id().primaryKey(),
      email: model.text(),
    }, [
      { columns: ["email"], unique: true, name: "uq_my_table_email" },
    ])

    expect(MyModel.indexes[0].unique).toBe(true)
    expect(MyModel.indexes[0].name).toBe("uq_my_table_email")
  })

  it("model properties retain their type metadata", () => {
    const MyModel = model.define("test", {
      id: model.id().primaryKey(),
      label: model.text().nullable(),
      count: model.number().default(0),
      kind: model.enum(["a", "b"]).default("a"),
    })

    expect(MyModel.schema.id._primaryKey).toBe(true)
    expect(MyModel.schema.label._nullable).toBe(true)
    expect(MyModel.schema.count._default).toBe(0)
    expect(MyModel.schema.kind._values).toEqual(["a", "b"])
    expect(MyModel.schema.kind._default).toBe("a")
  })
})
