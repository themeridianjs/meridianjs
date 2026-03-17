# Testing Patterns

**Analysis Date:** 2026-03-17

## Test Framework

**Runner:**
- Vitest 2.1.8
- Config: `vitest.config.ts` at project root
- Environment: Node.js (ESM)
- Globals enabled: `describe`, `it`, `expect`, `vi`, `beforeEach`, etc. available without imports

**Assertion Library:**
- Vitest built-in assertions (compatible with Jest API)
- Matchers: `.toHaveBeenCalledOnce()`, `.toMatchObject()`, `.toHaveProperty()`, `.toEqual()`, `.toBe()`, `.not.toHaveBeenCalled()`, etc.

**Run Commands:**
```bash
npm test                # Run all tests (runs vitest run)
npm run test            # Shortcut in root package.json
npm test -- --watch    # Watch mode (from any package)
npm run test -- --coverage  # Coverage report (v8 provider, outputs text + lcov)
```

## Test File Organization

**Location:**
- Co-located with source code (same directory)
- Naming: `{module}.test.ts` (e.g., `validate.test.ts` next to `validate.ts`)

**Naming:**
- Test files: `*.test.ts` or `*.spec.ts` (project uses `.test.ts`)
- Suite names: match exported function (e.g., `describe("validate()", ...)`)
- Test cases: imperative sentences describing behavior (e.g., "calls next() when body is valid")

**Current Test Coverage:**
- `packages/framework/src/validate.test.ts` — Zod validation middleware
- `packages/framework-utils/src/dml.test.ts` — DML model definitions
- `packages/modules/auth/src/middleware.test.ts` — JWT authentication middleware

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

describe("functionName()", () => {
  it("describes expected behavior when condition X", () => {
    const input = ...
    const result = functionUnderTest(input)
    expect(result).toEqual(...)
  })
})
```

**Patterns:**
- Setup: `buildMocks()` helper function for creating mock request/response objects
- Teardown: Not explicitly used; Vitest cleans up per-test automatically
- Assertion: Direct `expect()` calls; no assertion libraries beyond Vitest built-ins
- Test isolation: Each test builds its own mocks, no shared state

## Mocking

**Framework:** Vitest's `vi` mock utilities

**Patterns:**
```typescript
const next = vi.fn()
const res = {
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
}
expect(next).toHaveBeenCalledOnce()
expect(res.status).toHaveBeenCalledWith(400)
```

**Mock Factory (buildMocks pattern):**
```typescript
function buildMocks(body: unknown) {
  const req = { body } as any
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any
  const next = vi.fn()
  return { req, res, next }
}
```

**Token Signing (for JWT tests):**
```typescript
import jwt from "jsonwebtoken"
const TEST_SECRET = "test-jwt-secret"
function signToken(payload: object, secret = TEST_SECRET) {
  return jwt.sign(payload, secret)
}
```

**What to Mock:**
- Express `req`, `res` objects (always mocked in middleware tests)
- DI container `.resolve()` calls (return test config or service mocks)
- External services (return fixed test data)

**What NOT to Mock:**
- JWT signing/verification (use real `jsonwebtoken` library)
- Zod schema validation (test against real schema)
- Core business logic (test actual functions)

## Fixtures and Factories

**Test Data:**
```typescript
const TEST_SECRET = "test-jwt-secret"
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
const token = signToken({ sub: "user-123", roles: ["member"] })
```

**Location:**
- Inline in test files (no shared fixtures directory detected)
- Helper functions defined at file top or in describe block
- No factory libraries used; plain TypeScript object literals

## Coverage

**Requirements:** No minimum coverage enforced (none detected in config)

**View Coverage:**
```bash
npm test -- --coverage
# Outputs: text summary + lcov report to coverage/
```

## Test Types

**Unit Tests:**
- Scope: Individual functions (middleware, validators, service methods)
- Approach: Mock external dependencies, test return values and side effects
- Examples: `validate.test.ts` (middleware behavior), `dml.test.ts` (model schema storage)

**Integration Tests:**
- Scope: Not found in package tests; test-app (`apps/test-app/`) serves as integration test environment
- Approach: Real Express server, real database, real module loading
- How to run: `node --import tsx/esm apps/test-app/src/main.ts`

**E2E Tests:**
- Framework: Not implemented

## Common Patterns

**Error Testing:**
```typescript
it("responds 400 when body is invalid", () => {
  const { req, res, next } = buildMocks({ email: "invalid" })
  validate(schema)(req, res, next)
  expect(next).not.toHaveBeenCalled()
  expect(res.status).toHaveBeenCalledWith(400)
})
```

**Async Testing:**
```typescript
it("populates req.user for valid token", () => {
  const token = signToken({ sub: "user-123" })
  const { req, res, next } = buildMocks()
  authenticateJWT(req, res, next)
  expect(next).toHaveBeenCalledOnce()
})
```

**Mock Return Chaining:**
```typescript
const res = {
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
}
```

**Negative Assertions:**
```typescript
expect(req.user).toBeUndefined()
expect(next).not.toHaveBeenCalled()
```

## Database Testing

**ORM:** MikroORM (PostgreSQL)

**Test Database:**
- Requires running PostgreSQL locally: `createdb meridian_test`
- Test app uses environment config for connection
- Auto-syncs schema in dev mode: `updateSchema({ safe: true })`
- Not currently tested in Vitest (integration tests run against test-app)

## Code Coverage Examples

**validate.test.ts (6 test cases):**
- Valid input → calls next()
- Valid input with extra fields → strips fields
- Invalid input → responds 400
- Validation error → includes per-field details in response
- Missing required fields → responds 400

**middleware.test.ts (7 test cases):**
- Valid Bearer token → populates req.user
- Missing roles → defaults to []
- Missing Authorization header → responds 401
- Wrong Bearer prefix → responds 401
- Expired token → responds 401
- Malformed token → responds 401
- Token with wrong signature → responds 401

**dml.test.ts (5 test cases):**
- Model definition stores tableName and schema
- Indexes default to empty array
- Provided indexes are stored
- Unique index flag preserved
- Schema properties retain type metadata

---

*Testing analysis: 2026-03-17*
