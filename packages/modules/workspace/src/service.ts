import { MeridianService } from "@meridian/framework-utils"
import type { MeridianContainer } from "@meridian/types"
import WorkspaceModel from "./models/workspace.js"

export class WorkspaceModuleService extends MeridianService({ Workspace: WorkspaceModel }) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  /** Find a workspace by its URL slug. */
  async retrieveWorkspaceBySlug(slug: string): Promise<any | null> {
    const repo = this.container.resolve<any>("workspaceRepository")
    try {
      return await repo.findOneOrFail({ slug })
    } catch {
      return null
    }
  }

  /** Generate a unique slug from a workspace name. */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }
}
