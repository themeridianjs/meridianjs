import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import AppRoleModel from "./models/app-role.js"

export class AppRoleModuleService extends MeridianService({
  AppRole: AppRoleModel,
}) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  async getPermissionsForRole(roleId: string): Promise<string[]> {
    const repo = this.container.resolve<any>("appRoleRepository")
    const role = await repo.findOne({ id: roleId })
    if (!role) return []
    return Array.isArray(role.permissions) ? role.permissions : []
  }
}
