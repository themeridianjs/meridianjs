import { MeridianService } from "@meridian/framework-utils"
import type { MeridianContainer } from "@meridian/types"
import IssueModel from "./models/issue.js"
import CommentModel from "./models/comment.js"

export interface CreateIssueInput {
  title: string
  project_id: string
  workspace_id: string
  description?: string
  type?: string
  priority?: string
  status?: string
  assignee_ids?: string[]
  reporter_id?: string
  parent_id?: string
  due_date?: Date
  estimate?: number
}

export class IssueModuleService extends MeridianService({
  Issue: IssueModel,
  Comment: CommentModel,
}) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  /**
   * Create an issue with an auto-generated sequential identifier (e.g. PROJ-42).
   * Looks up the project to get its identifier prefix, then assigns the next number.
   */
  async createIssueInProject(input: CreateIssueInput): Promise<any> {
    const issueRepo = this.container.resolve<any>("issueRepository")
    const projectService = this.container.resolve<any>("projectModuleService")

    const project = await projectService.retrieveProject(input.project_id)
    if (!project) {
      throw Object.assign(new Error(`Project ${input.project_id} not found`), { status: 404 })
    }

    // Get the next sequential number for this project
    const existing = await issueRepo.find({ project_id: input.project_id })
    const maxNumber = (existing as any[]).reduce(
      (max: number, issue: any) => Math.max(max, issue.number ?? 0),
      0
    )
    const nextNumber = maxNumber + 1
    const identifier = `${project.identifier}-${nextNumber}`

    const issue = issueRepo.create({
      ...input,
      number: nextNumber,
      identifier,
      type: input.type ?? "task",
      priority: input.priority ?? "none",
      status: input.status ?? "backlog",
    })
    await issueRepo.persistAndFlush(issue)
    return issue
  }

  /** List issues for a project with optional filters. */
  async listIssuesByProject(
    projectId: string,
    filters: { status?: string; type?: string } = {},
    options: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    const repo = this.container.resolve<any>("issueRepository")
    return repo.find(
      { project_id: projectId, ...filters },
      { limit: options.limit ?? 50, offset: options.offset ?? 0 }
    )
  }

  /** List all comments for an issue. */
  async listCommentsByIssue(issueId: string): Promise<any[]> {
    const repo = this.container.resolve<any>("commentRepository")
    return repo.find({ issue_id: issueId })
  }

  /** Add a comment to an issue. */
  async createComment(input: {
    issue_id: string
    body: string
    author_id: string
  }): Promise<any> {
    const repo = this.container.resolve<any>("commentRepository")
    const comment = repo.create(input)
    await repo.persistAndFlush(comment)
    return comment
  }
}
