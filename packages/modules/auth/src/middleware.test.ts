import { describe, it, expect, vi, beforeEach } from "vitest"
import jwt from "jsonwebtoken"
import { authenticateJWT } from "./middleware.js"

const TEST_SECRET = "test-jwt-secret-for-unit-tests"

function buildMocks(overrides: Partial<{ authorization: string | undefined }> = {}) {
  const authorization =
    "authorization" in overrides ? overrides.authorization : undefined

  const req: any = {
    headers: {
      ...(authorization !== undefined ? { authorization } : {}),
    },
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === "config") {
          return { projectConfig: { jwtSecret: TEST_SECRET } }
        }
        throw new Error(`Unknown container key: ${key}`)
      }),
    },
  }

  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }

  const next = vi.fn()
  return { req, res, next }
}

function signToken(payload: object, secret = TEST_SECRET, options?: jwt.SignOptions) {
  return jwt.sign(payload, secret, options)
}

describe("authenticateJWT()", () => {
  it("populates req.user and calls next() for a valid Bearer token", () => {
    const token = signToken({ sub: "user-123", roles: ["member"], workspaceId: "ws-1" })
    const { req, res, next } = buildMocks({ authorization: `Bearer ${token}` })

    authenticateJWT(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toMatchObject({ id: "user-123", roles: ["member"], workspaceId: "ws-1" })
    expect(res.status).not.toHaveBeenCalled()
  })

  it("defaults roles to [] when not in token payload", () => {
    const token = signToken({ sub: "user-456" })
    const { req, res, next } = buildMocks({ authorization: `Bearer ${token}` })

    authenticateJWT(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user.roles).toEqual([])
  })

  it("responds 401 when Authorization header is missing", () => {
    const { req, res, next } = buildMocks({ authorization: undefined })

    authenticateJWT(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ message: expect.stringContaining("Bearer") }) })
    )
  })

  it("responds 401 when Authorization header lacks 'Bearer ' prefix", () => {
    const token = signToken({ sub: "user-789" })
    const { req, res, next } = buildMocks({ authorization: `Token ${token}` })

    authenticateJWT(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("responds 401 for an expired token", () => {
    const token = signToken({ sub: "user-expired" }, TEST_SECRET, { expiresIn: -1 })
    const { req, res, next } = buildMocks({ authorization: `Bearer ${token}` })

    authenticateJWT(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ message: "Invalid or expired token" }) })
    )
  })

  it("responds 401 for a malformed token", () => {
    const { req, res, next } = buildMocks({ authorization: "Bearer this.is.not.valid" })

    authenticateJWT(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("responds 401 for a token signed with a different secret", () => {
    const token = signToken({ sub: "user-bad-sig" }, "wrong-secret")
    const { req, res, next } = buildMocks({ authorization: `Bearer ${token}` })

    authenticateJWT(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })
})
