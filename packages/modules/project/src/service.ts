import { MeridianService } from "@meridian/framework-utils"
import type { MeridianContainer } from "@meridian/types"
import ProjectModel from "./models/project.js"
import LabelModel from "./models/label.js"
import MilestoneModel from "./models/milestone.js"
import ProjectStatusModel from "./models/project-status.js"

export class ProjectModuleService extends MeridianService({
  Project: ProjectModel,
  Label: LabelModel,
  Milestone: MilestoneModel,
  ProjectStatus: ProjectStatusModel,
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
   * Generate a 3–5 character uppercase alphanumeric identifier from a project name.
   * - Prefer at least 4 chars; if the name is only 3 letters, use those (e.g. "API" → "API").
   * - Multiple words: acronym (first letter of each); if < 4 chars, extend with subsequent letters.
   * - Single word 4+: first 4 (e.g. "Backend" → "BACK"). Single word 1–2: pad to 4 with "X".
   * Examples: "My Project" → "MPYR", "API" → "API", "Backend" → "BACK", "Alpha Beta" → "ABLP".
   */
  generateIdentifier(name: string): string {
    const words = name
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
      .filter(Boolean)

    if (words.length === 0) return "PROJ"

    const maxLen = 5

    if (words.length === 1) {
      const word = words[0]
      if (word.length >= 4) return word.substring(0, maxLen)
      if (word.length === 3) return word
      return word.padEnd(4, "X").substring(0, maxLen)
    }

    // Multiple words: acronym then extend with subsequent letters until length >= 4
    let acronym = words.map((w) => w[0]).join("")
    if (acronym.length >= 4) return acronym.substring(0, maxLen)

    let result = acronym
    let wi = 0
    let ci = 1
    while (result.length < 4 && wi < words.length) {
      const word = words[wi]
      if (ci < word.length) {
        result += word[ci]
        ci++
      } else {
        wi++
        ci = 1
      }
    }
    result = result.substring(0, maxLen)
    return result.length >= 4 ? result : result.padEnd(4, "X").substring(0, maxLen)
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

  /** List all statuses for a given project, ordered by position. */
  async listStatusesByProject(projectId: string): Promise<any[]> {
    const repo = this.container.resolve<any>("projectStatusRepository")
    return repo.find({ project_id: projectId }, { orderBy: { position: "ASC" } })
  }

  /** Update position field for each status to match the provided orderedIds index. */
  async reorderStatuses(projectId: string, orderedIds: string[]): Promise<void> {
    const repo = this.container.resolve<any>("projectStatusRepository")
    for (let i = 0; i < orderedIds.length; i++) {
      const entity = await repo.findOneOrFail({ id: orderedIds[i], project_id: projectId })
      Object.assign(entity as object, { position: i })
    }
    await repo.flush()
  }
}
