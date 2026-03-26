/**
 * Assigns the system "User" app-role to a user if no custom role is specified.
 * Non-fatal — silently catches errors (e.g. app-role module not loaded).
 */
export async function assignDefaultUserRole(req: any, userId: string, appRoleId?: string): Promise<void> {
  try {
    const userService = req.scope.resolve("userModuleService") as any
    if (appRoleId) {
      await userService.updateUser(userId, { app_role_id: appRoleId })
    } else {
      const appRoleService = req.scope.resolve("appRoleModuleService") as any
      const [userRoles] = await appRoleService.listAndCountAppRoles({ name: "User", is_system: true }, { limit: 1 })
      if (userRoles.length > 0) {
        await userService.updateUser(userId, { app_role_id: userRoles[0].id })
      }
    }
  } catch {
    // Non-fatal — app-role module may not be loaded
  }
}
