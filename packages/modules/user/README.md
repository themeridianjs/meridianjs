# @meridianjs/user

User, Team, and session management module for MeridianJS. Provides the `User` and `Team` data models, auto-generated CRUD, and custom helpers for email/Google ID lookups, login tracking, and session management.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Service: `userModuleService`

Resolve from the DI container in a route handler:

```typescript
const svc = req.scope.resolve("userModuleService") as any
```

### Auto-generated CRUD

```typescript
// Users
await svc.listUsers(filters?, options?)
await svc.listAndCountUsers(filters?, options?)
await svc.retrieveUser(id)
await svc.createUser(data)
await svc.updateUser(id, data)
await svc.deleteUser(id)
await svc.softDeleteUser(id)

// Teams
await svc.listTeams(filters?, options?)
await svc.retrieveTeam(id)
await svc.createTeam(data)
await svc.updateTeam(id, data)
await svc.deleteTeam(id)
```

### Custom Methods

```typescript
// Find a user by email address (returns null if not found)
const user = await svc.retrieveUserByEmail("alice@example.com")

// Find a user by their Google OAuth ID
const user = await svc.retrieveUserByGoogleId(googleId)

// Update last_login_at timestamp
await svc.recordLogin(userId)

// Deactivate an account (sets is_active: false)
await svc.deactivateUser(userId)

// Total registered user count
const count = await svc.countUsers()

// Session management (for JWT revocation)
await svc.createSession(jti, userId, expiresAt)
await svc.retrieveValidSession(jti)
await svc.revokeSession(jti)
```

## Data Models

### User

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `email` | `text` | Unique email address |
| `password_hash` | `text` | bcrypt hash (nullable for OAuth users) |
| `first_name` | `text` | — |
| `last_name` | `text` | — |
| `google_id` | `text` | Google OAuth ID (nullable) |
| `picture` | `text` | Profile picture URL (nullable) |
| `is_active` | `boolean` | Account active flag |
| `last_login_at` | `datetime` | Last successful login |
| `app_role_id` | `text` | Optional custom RBAC role |
| `created_at` | `datetime` | — |
| `updated_at` | `datetime` | — |

### Team

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Team name |
| `workspace_id` | `text` | Owning workspace |
| `created_at` | `datetime` | — |

## License

MIT
