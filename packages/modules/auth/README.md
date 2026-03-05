# @meridianjs/auth

Authentication module for MeridianJS. Provides JWT-based register/login flows, Google OAuth support, Express middleware for token verification, and RBAC guards.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Service: `authModuleService`

```typescript
const svc = req.scope.resolve("authModuleService") as any
```

### Methods

```typescript
// Register a new user — returns { user, token }
const { user, token } = await svc.register({
  email: "alice@example.com",
  password: "password123",
  first_name: "Alice",
  last_name: "Smith",
  role: "member",       // optional: "super-admin" | "admin" | "moderator" | "member"
})

// Login — returns { user, token }
const { user, token } = await svc.login({
  email: "alice@example.com",
  password: "password123",
})

// Verify and decode a JWT
const payload = await svc.verifyToken(token)
// payload: { sub, workspaceId, roles, permissions, jti }
```

## Middleware

### `authenticateJWT`

Verifies the `Authorization: Bearer <token>` header and attaches `req.user`. Returns `401` if the token is missing or invalid.

```typescript
import { authenticateJWT } from "@meridianjs/auth"

// Applied globally in middlewares.ts:
export default {
  routes: [
    { matcher: "/admin", middlewares: [authenticateJWT] },
  ],
}

// Or inline in a route:
export const GET = [authenticateJWT, async (req: any, res: Response) => {
  res.json({ userId: req.user.id })
}]
```

### `requireRoles`

Guard a route or handler to specific roles. Returns `403` if the user's roles don't match.

```typescript
import { requireRoles } from "@meridianjs/auth"

export const DELETE = [
  authenticateJWT,
  requireRoles("admin", "super-admin"),
  async (req: any, res: Response) => {
    // Only admins reach here
  },
]
```

### `requirePermission`

Guard based on a specific permission string from a custom AppRole:

```typescript
import { requirePermission } from "@meridianjs/auth"

export const POST = [
  authenticateJWT,
  requirePermission("issues:create"),
  async (req: any, res: Response) => { /* ... */ },
]
```

## JWT Payload

```typescript
interface JwtPayload {
  sub: string           // User ID
  workspaceId: string   // Active workspace ID (null until workspace selected)
  roles: string[]       // e.g. ["admin"] or ["member"]
  permissions: string[] // Custom AppRole permissions (e.g. ["issues:create", "issues:delete"])
  jti: string           // Unique token ID (for revocation)
  iat: number
  exp: number
}
```

Tokens expire after **7 days** by default. Configure in `projectConfig`:

```typescript
projectConfig: {
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: "30d",  // optional
}
```

## Google OAuth

When `@meridianjs/google-oauth` is configured, the auth module exposes:

```
GET /auth/google           → Redirects to Google consent screen
GET /auth/google/callback  → Handles OAuth code, returns JWT
```

## API Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register, return `{ user, token }` |
| `POST` | `/auth/login` | Login, return `{ user, token }` |
| `GET` | `/auth/invite/:token` | Validate an invitation token |
| `POST` | `/auth/invite/:token` | Accept invitation (register or login) |

## License

MIT
