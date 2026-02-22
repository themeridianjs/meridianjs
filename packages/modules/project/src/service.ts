import { MeridianService } from "@meridian/framework-utils"
import type { MeridianContainer } from "@meridian/types"
import ProjectModel from "./models/project.js"
import LabelModel from "./models/label.js"
import MilestoneModel from "./models/milestone.js"

export class ProjectModuleService extends MeridianService({
  Project: ProjectModel,
  Label: LabelModel,
  Milestone: MilestoneModel,
}) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  /** Find a project by its short identifier code (e.g. "PROJ"). */
  async retrieveProjectByIdentifier(identifier: string): Promise<any | null> {
    const repo = this.container.resolve<any>("projectRepository")
    try {
      return await repo.findOneOrFail({ identifier: identifier.toUpperCase() })
    } catch {
      return null
    }
  }

  /**
   * Generate a 2-4 character uppercase identifier from a project name.
   * e.g. "My Project" → "MYPR", "Backend" → "BACK"
   */
  generateIdentifier(name: string): string {
    const base = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 4)
    return base.padEnd(2, "X")
  }

  /** List all labels for a given project. */
  async listLabelsByProject(projectId: string): Promise<any[]> {
    const repo = this.container.resolve<any>("labelRepository")
    return repo.find({ project_id: projectId })
  }

  /** List all milestones for a given project. */
  async listMilestonesByProject(projectId: string): Promise<any[]> {
    const repo = this.container.resolve<any>("milestoneRepository")
    return repo.find({ project_id: projectId })
  }
}
