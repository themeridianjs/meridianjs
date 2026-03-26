const ROLE_RANK: Record<string, number> = {
  "super-admin": 3,
  "admin": 2,
  "moderator": 1,
  "member": 0,
}

/**
 * Finds all pending invitations for the given email, applies their workspace
 * memberships / roles / app roles to the user, and marks each as "accepted".
 *
 * Returns `true` if any invitations were applied (caller should re-sign the
 * JWT to reflect the updated role/permissions).
 *
 * Non-fatal — never throws. Registration must succeed even if invite
 * processing fails.
 */
export async function applyPendingInvites(
  scope: any,
  userId: string,
  email: string,
): Promise<boolean> {
  try {
    const invitationService = scope.resolve("invitationModuleService") as any
    const workspaceMemberService = scope.resolve("workspaceMemberModuleService") as any
    const userService = scope.resolve("userModuleService") as any

    const normalizedEmail = email.toLowerCase().trim()
    const [invitations] = await invitationService.listAndCountInvitations(
      { email: normalizedEmail, status: "pending" },
      { limit: 100 },
    )

    if (!invitations || invitations.length === 0) return false

    let highestRole = "member"

    for (const inv of invitations) {
      // Create workspace membership
      if (inv.workspace_id) {
        const wsRole: "admin" | "member" = inv.role === "member" ? "member" : "admin"
        await workspaceMemberService.ensureMember(inv.workspace_id, userId, wsRole).catch(() => {})
      }

      // Track highest role across all invitations
      if ((ROLE_RANK[inv.role] ?? 0) > (ROLE_RANK[highestRole] ?? 0)) {
        highestRole = inv.role
      }

      // Apply app_role_id from invitation (or default to "User" system role)
      try {
        if (inv.app_role_id) {
          await userService.updateUser(userId, { app_role_id: inv.app_role_id })
        } else {
          const appRoleService = scope.resolve("appRoleModuleService") as any
          const [userRoles] = await appRoleService.listAndCountAppRoles(
            { name: "User", is_system: true },
            { limit: 1 },
          )
          if (userRoles.length > 0) {
            await userService.updateUser(userId, { app_role_id: userRoles[0].id })
          }
        }
      } catch {
        // Non-fatal
      }

      // Mark invitation as accepted
      await invitationService.updateInvitation(inv.id, { status: "accepted" }).catch(() => {})
    }

    // Upgrade user's system role if any invitation grants a higher one
    const user = await userService.retrieveUser(userId).catch(() => null)
    if (user && (ROLE_RANK[highestRole] ?? 0) > (ROLE_RANK[user.role] ?? 0)) {
      await userService.updateUser(userId, { role: highestRole }).catch(() => {})
    }

    return true
  } catch {
    // Entire block is non-fatal — registration must not fail
    return false
  }
}
