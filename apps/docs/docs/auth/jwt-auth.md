---
id: jwt-auth
title: JWT Authentication
description: Registration, login flow, token shape, and password hashing.
sidebar_position: 1
---

# JWT Authentication

MeridianJS uses stateless JWT authentication. Tokens are issued on register/login and must be sent as a `Bearer` token in the `Authorization` header on protected routes.

---

## Registration Flow

```
POST /auth/register
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "my-password",
  "first_name": "Alice",
  "last_name": "Smith"
}
```

Response:
```json
{
  "user": {
    "id": "user_01HXYZ...",
    "email": "alice@example.com",
    "first_name": "Alice",
    "last_name": "Smith",
    "created_at": "2025-01-15T10:00:00.000Z"
  },
  "token": "eyJhbGci..."
}
```

Internally:
1. Hashes the password with bcrypt (12 rounds)
2. Creates the user via `userModuleService.createUser()`
3. Signs a JWT with `{ id, email, workspaceId: null, roles: [] }`

---

## Login Flow

```
POST /auth/login
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "my-password"
}
```

Response is the same shape as registration. Login also calls `userModuleService.recordLogin()` to update `last_login_at`.

---

## Using the Token

All `/admin/*` routes require a valid JWT. Pass it in the `Authorization` header:

```bash
curl -H "Authorization: Bearer eyJhbGci..." \
     https://your-app.com/admin/projects
```

In the admin dashboard, the token is stored in `localStorage` and injected by a TanStack Query client default header.

---

## Token Shape

The JWT payload is:

```typescript
{
  id: string           // User UUID
  email: string
  workspaceId: string  // Active workspace UUID (null until workspace is selected)
  roles: string[]      // e.g. ['admin'] or ['member'] or permission strings
  iat: number          // Issued at (Unix timestamp)
  exp: number          // Expiry (default: 7 days)
}
```

---

## Changing the Secret and Expiry

Set `JWT_SECRET` in your environment. The expiry defaults to `7d` and can be overridden in `projectConfig`:

```typescript
projectConfig: {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '30d',  // optional, default '7d'
}
```

---

## Google OAuth

If configured, users can also authenticate via Google:

1. `GET /auth/google` — redirects to Google consent screen
2. `GET /auth/google/callback` — receives OAuth code, creates/finds user, returns JWT

Configure in `projectConfig`:
```typescript
projectConfig: {
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl: 'https://your-app.com/auth/google/callback',
}
```
