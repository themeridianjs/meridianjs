import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import IssueModel from "./models/issue.js"
import CommentModel from "./models/comment.js"
import AttachmentModel from "./models/attachment.js"
import TimeLogModel from "./models/time-log.js"
import TaskListModel from "./models/task-list.js"

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
  parent_id?: string | null
  start_date?: Date | null
  due_date?: Date
  estimate?: number
  sprint_id?: string | null
  task_list_id?: string | null
}

export interface CreateAttachmentInput {
  issue_id: string
  comment_id?: string | null
  filename: string
  original_name: string
  mime_type: string
  size: number
  url: string
  uploader_id: string
  workspace_id: string
}

export interface CreateManualTimeLogInput {
  issue_id: string
  user_id: string
  workspace_id: string
  duration_minutes: number
  description?: string
  logged_date?: Date
}

export class IssueModuleService extends MeridianService({
  Issue: IssueModel,
  Comment: CommentModel,
  Attachment: AttachmentModel,
  TimeLog: TimeLogModel,
  TaskList: TaskListModel,
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

  // ---------------------------------------------------------------------------
  // Attachments
  // ---------------------------------------------------------------------------

  /** List all attachments for an issue, ordered by creation date. */
  async listAttachmentsByIssue(issueId: string): Promise<any[]> {
    const repo = this.container.resolve<any>("attachmentRepository")
    return repo.find({ issue_id: issueId }, { orderBy: { created_at: "ASC" } })
  }

  /** Persist an attachment record after the file has been stored on disk. */
  async createAttachment(input: CreateAttachmentInput): Promise<any> {
    const repo = this.container.resolve<any>("attachmentRepository")
    const attachment = repo.create(input)
    await repo.persistAndFlush(attachment)
    return attachment
  }

  /** Delete an attachment record by ID. The caller is responsible for removing the file. */
  async deleteAttachment(attachmentId: string): Promise<any> {
    const repo = this.container.resolve<any>("attachmentRepository")
    const attachment = await repo.findOne({ id: attachmentId })
    if (!attachment) {
      throw Object.assign(new Error(`Attachment ${attachmentId} not found`), { status: 404 })
    }
    await repo.removeAndFlush(attachment)
    return attachment
  }

  // ---------------------------------------------------------------------------
  // Time Logging
  // ---------------------------------------------------------------------------

  /** List all time log entries for an issue, newest first. */
  async listTimeLogsByIssue(issueId: string): Promise<any[]> {
    const repo = this.container.resolve<any>("timeLogRepository")
    return repo.find({ issue_id: issueId }, { orderBy: { created_at: "DESC" } })
  }

  /** Create a manual time log entry with an explicit duration. */
  async createManualTimeLog(input: CreateManualTimeLogInput): Promise<any> {
    const repo = this.container.resolve<any>("timeLogRepository")
    const entry = repo.create({
      ...input,
      source: "manual",
      logged_date: input.logged_date ?? new Date(),
    })
    await repo.persistAndFlush(entry)
    return entry
  }

  /**
   * Start a timer for a user on an issue.
   * Throws if the user already has an active timer on this issue.
   */
  async startTimer(issueId: string, userId: string, workspaceId: string): Promise<any> {
    const repo = this.container.resolve<any>("timeLogRepository")

    const active = await repo.findOne({
      issue_id: issueId,
      user_id: userId,
      started_at: { $ne: null },
      stopped_at: null,
    })
    if (active) {
      throw Object.assign(
        new Error("A timer is already running for this issue. Stop it before starting a new one."),
        { status: 409 }
      )
    }

    const entry = repo.create({
      issue_id: issueId,
      user_id: userId,
      workspace_id: workspaceId,
      source: "timer",
      started_at: new Date(),
    })
    await repo.persistAndFlush(entry)
    return entry
  }

  /**
   * Stop the active timer for a user on an issue.
   * Calculates duration from started_at and finalises the entry.
   */
  async stopTimer(issueId: string, userId: string): Promise<any> {
    const repo = this.container.resolve<any>("timeLogRepository")

    const active = await repo.findOne({
      issue_id: issueId,
      user_id: userId,
      started_at: { $ne: null },
      stopped_at: null,
    })
    if (!active) {
      throw Object.assign(
        new Error("No active timer found for this issue."),
        { status: 404 }
      )
    }

    const now = new Date()
    const durationMs = now.getTime() - new Date(active.started_at).getTime()
    const durationMinutes = Math.max(1, Math.round(durationMs / 60_000))

    active.stopped_at = now
    active.duration_minutes = durationMinutes
    active.logged_date = now
    await repo.persistAndFlush(active)
    return active
  }

  /** Return the running timer entry for a user on an issue, or null if none. */
  async getActiveTimer(issueId: string, userId: string): Promise<any | null> {
    const repo = this.container.resolve<any>("timeLogRepository")
    return repo.findOne({
      issue_id: issueId,
      user_id: userId,
      started_at: { $ne: null },
      stopped_at: null,
    }) ?? null
  }

  /** Delete a time log entry by ID. */
  async deleteTimeLog(id: string): Promise<any> {
    const repo = this.container.resolve<any>("timeLogRepository")
    const entry = await repo.findOne({ id })
    if (!entry) {
      throw Object.assign(new Error(`Time log entry ${id} not found`), { status: 404 })
    }
    await repo.removeAndFlush(entry)
    return entry
  }

  // ---------------------------------------------------------------------------
  // Task Lists
  // ---------------------------------------------------------------------------

  /** List all task lists for a project, ordered by position. */
  async listTaskListsByProject(projectId: string): Promise<any[]> {
    const repo = this.container.resolve<any>("taskListRepository")
    return repo.find({ project_id: projectId }, { orderBy: { position: "ASC" } })
  }

  /** Create a task list for a project. Position defaults to max+1. */
  async createTaskList(input: { name: string; description?: string; project_id: string }): Promise<any> {
    const repo = this.container.resolve<any>("taskListRepository")
    const existing = await repo.find({ project_id: input.project_id })
    const maxPos = (existing as any[]).reduce((m: number, tl: any) => Math.max(m, tl.position ?? 0), -1)
    const taskList = repo.create({ ...input, position: maxPos + 1 })
    await repo.persistAndFlush(taskList)
    return taskList
  }

  /** Update a task list's name or description. */
  async updateTaskList(id: string, data: { name?: string; description?: string }): Promise<any> {
    const repo = this.container.resolve<any>("taskListRepository")
    const taskList = await repo.findOne({ id })
    if (!taskList) throw Object.assign(new Error(`TaskList ${id} not found`), { status: 404 })
    Object.assign(taskList, data)
    await repo.persistAndFlush(taskList)
    return taskList
  }

  /** Delete a task list by ID. Clears task_list_id on associated issues. */
  async deleteTaskList(id: string): Promise<any> {
    const taskListRepo = this.container.resolve<any>("taskListRepository")
    const issueRepo = this.container.resolve<any>("issueRepository")
    const taskList = await taskListRepo.findOne({ id })
    if (!taskList) throw Object.assign(new Error(`TaskList ${id} not found`), { status: 404 })
    // Clear task_list_id on all issues that belonged to this list
    const issues = await issueRepo.find({ task_list_id: id })
    for (const issue of issues as any[]) {
      issue.task_list_id = null
    }
    if ((issues as any[]).length > 0) await issueRepo.flush()
    await taskListRepo.removeAndFlush(taskList)
    return taskList
  }
}
