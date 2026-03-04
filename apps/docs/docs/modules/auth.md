---
id: auth
title: Auth Module
description: AuthModuleService — register, login, verifyToken, and JWT payload.
sidebar_position: 2
---

# Auth Module (`@meridianjs/auth`)

The auth module provides JWT-based authentication. It has no models of its own — it delegates user storage to `@meridianjs/user` and workspace lookup to `@meridianjs/workspace`.

---

## Service Methods

### `register(data)`

Creates a new user and returns a signed JWT.

```typescript
const authSvc = req.scope.resolve('authModuleService') as AuthModuleService

const { user, token } = await authSvc.register({
  email: 'alice@example.com',
  password: 'super-secret',
  first_name: 'Alice',
  last_name: 'Smith',
})
```

Internally: hashes the password with bcrypt (rounds: 12), creates the user via `userModuleService.createUser()`, then signs a JWT.

### `login(data)`

Verifies credentials and returns a JWT.

```typescript
const { user, token } = await authSvc.login({
  email: 'alice@example.com',
  password: 'super-secret',
})
```

Throws `UnauthorizedException` if the email doesn't exist or the password doesn't match.

### `verifyToken(token)`

Decodes and validates a JWT. Returns the payload or throws.

```typescript
const payload = await authSvc.verifyToken(token)
// payload: { id, email, workspaceId, roles }
```

---

## JWT Payload Shape

```typescript
interface JwtPayload {
  id: string           // user.id
  email: string        // user.email
  workspaceId: string  // active workspace
  roles: string[]      // e.g. ['admin', 'member'] or custom AppRole permissions
}
```

The `roles` array contains the user's role strings for the active workspace. When `@meridianjs/app-role` is used, it also includes custom permission strings from the user's assigned AppRole.

---

## Routes

The auth module registers these routes via `@meridianjs/meridian`:

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register + get token |
| `POST` | `/auth/login` | Login + get token |
| `GET` | `/auth/invite/:token` | Validate invitation token |
| `POST` | `/auth/invite/:token` | Accept invitation (register or login) |

---

## Google OAuth (optional)

The framework also supports Google OAuth2 via `GET /auth/google` and `GET /auth/google/callback`. This is configured in `projectConfig`:

```typescript
projectConfig: {
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
}
```
