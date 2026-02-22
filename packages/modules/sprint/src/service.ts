import { MeridianService } from "@meridian/framework-utils"
import type { MeridianContainer } from "@meridian/types"
import SprintModel from "./models/sprint.js"

export class SprintModuleService extends MeridianService({ Sprint: SprintModel }) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  /** List all sprints for a project. */
  async listSprintsByProject(projectId: string): Promise<any[]> {
    const repo = this.container.resolve<any>("sprintRepository")
    return repo.find({ project_id: projectId })
  }

  /** Start a sprint — sets status to "active" and records start_date if not set. */
  async startSprint(sprintId: string): Promise<any> {
    const repo = this.container.resolve<any>("sprintRepository")
    const sprint = await repo.findOneOrFail({ id: sprintId }) as any

    if (sprint.status === "active") {
      throw Object.assign(new Error("Sprint is already active"), { status: 409 })
    }
    if (sprint.status === "completed") {
      throw Object.assign(new Error("Cannot restart a completed sprint"), { status: 409 })
    }

    sprint.status = "active"
    if (!sprint.start_date) sprint.start_date = new Date()
    await repo.flush()
    return sprint
  }

  /** Complete a sprint — sets status to "completed" and records end_date if not set. */
  async completeSprint(sprintId: string): Promise<any> {
    const repo = this.container.resolve<any>("sprintRepository")
    const sprint = await repo.findOneOrFail({ id: sprintId }) as any

    if (sprint.status !== "active") {
      throw Object.assign(new Error("Only active sprints can be completed"), { status: 409 })
    }

    sprint.status = "completed"
    if (!sprint.end_date) sprint.end_date = new Date()
    await repo.flush()
    return sprint
  }
}
