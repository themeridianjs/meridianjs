# @meridianjs/invitation

Workspace invitation module for MeridianJS. Generates secure token-based invites that allow new or existing users to join a workspace with a pre-assigned role.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## How Invitations Work

1. An admin calls `POST /admin/workspaces/:id/invitations` with an email and role.
2. The framework creates an `Invitation` record with a UUID token and sends a link to the invitee.
3. The invitee visits the link and calls `POST /auth/invite/:token`.
4. If the email is new, an account is created. If it already exists, the user is logged in.
5. A `WorkspaceMember` record is created with the invited role.
6. The invitation status is set to `"accepted"`.

## Service: `invitationModuleService`

```typescript
const svc = req.scope.resolve("invitationModuleService") as any
```

### Methods

```typescript
// Create an invitation with an auto-generated UUID token
const invite = await svc.createInvitationWithToken({
  workspace_id:   workspaceId,
  email:          "bob@example.com",  // optional — omit for open link invitations
  role:           "member",           // "super-admin" | "admin" | "member"
  app_role_id:    null,               // optional: assign a custom AppRole on join
  created_by:     req.user.id,
  expires_in_days: 7,                 // default: 7
})

// Revoke an invitation (sets status → "revoked")
await svc.revokeInvitation(inviteId)

// Standard CRUD
await svc.listInvitations(filters?)
await svc.retrieveInvitation(id)
```

## Data Model

### Invitation

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `workspace_id` | `text` | Target workspace |
| `email` | `text` | Invitee email (nullable for open links) |
| `role` | `text` | Role assigned on acceptance |
| `app_role_id` | `text` | Optional custom RBAC role |
| `token` | `text` | Unique UUID token (in the invite URL) |
| `status` | `text` | `"pending"` \| `"accepted"` \| `"revoked"` |
| `expires_at` | `datetime` | Expiry timestamp |
| `created_by` | `text` | Inviting user's ID |
| `created_at` | `datetime` | — |

## API Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/workspaces/:id/invitations` | Create and send an invitation |
| `GET` | `/auth/invite/:token` | Validate a token, return invite info |
| `POST` | `/auth/invite/:token` | Accept an invitation |

## License

MIT
