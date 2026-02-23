import { describe, it, expect, vi } from "vitest"
import { z } from "zod"
import { validate } from "./validate.js"

function buildMocks(body: unknown) {
  const req = { body } as any
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any
  const next = vi.fn()
  return { req, res, next }
}

describe("validate()", () => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  })

  it("calls next() when body is valid", () => {
    const { req, res, next } = buildMocks({ email: "user@example.com", password: "securepass" })
    validate(schema)(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("replaces req.body with the parsed (stripped) value on success", () => {
    const { req, res, next } = buildMocks({
      email: "user@example.com",
      password: "securepass",
      extra_field: "should-be-stripped",
    })
    validate(schema)(req, res, next)
    expect(req.body).toEqual({ email: "user@example.com", password: "securepass" })
    expect(req.body).not.toHaveProperty("extra_field")
  })

  it("responds 400 when body is invalid", () => {
    const { req, res, next } = buildMocks({ email: "not-an-email", password: "short" })
    validate(schema)(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it("includes per-field details in the 400 response", () => {
    const { req, res, next } = buildMocks({ email: "not-an-email", password: "short" })
    validate(schema)(req, res, next)
    const payload = res.json.mock.calls[0][0]
    expect(payload.error.message).toBe("Validation error")
    expect(payload.error.details).toHaveProperty("email")
    expect(payload.error.details).toHaveProperty("password")
  })

  it("responds 400 when required fields are missing", () => {
    const { req, res, next } = buildMocks({})
    validate(schema)(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
