// ─────────────────────────────────────────────────────────────────────────────
// Core Container & Dependency Injection
// ─────────────────────────────────────────────────────────────────────────────

export interface MeridianContainer {
  resolve<T = unknown>(token: string): T
  register(registrations: Record<string, unknown>): void
  createScope(): MeridianContainer
  dispose?(): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Module System
// ─────────────────────────────────────────────────────────────────────────────

export interface ModuleDefinition {
  key: string
  /**
   * Service constructor. Instantiated as `new service(moduleContainer, moduleOptions)` —
   * domain services typically accept only the container; infrastructure modules
   * (event bus, scheduler, email, storage) read their config from the second argument.
   */
  service: new (container: MeridianContainer, options?: Record<string, unknown>) => IModuleService
  models?: unknown[]
  loaders?: LoaderFn[]
  linkable?: LinkableConfig
}

/**
 * Marker interface for module services. The framework never calls methods on
 * services generically, so no shape is required here; callers narrow via
 * `resolveService<T>` or a concrete service type — never through `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IModuleService {}

export type LoaderFn = (options: LoaderOptions) => Promise<void>

export interface LoaderOptions {
  container: MeridianContainer
  options?: Record<string, unknown>
  logger: ILogger
}

export interface LinkableConfig {
  [modelName: string]: {
    tableName: string
    primaryKey: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

export type WorkerMode = "shared" | "worker" | "server"

export interface RegistrationConfig {
  enabled: boolean
  allowedDomains: string[]
}

export interface ProjectConfig {
  databaseUrl: string
  redisUrl?: string
  httpPort?: number
  jwtSecret: string
  cookieSecret?: string
  workerMode?: WorkerMode
  cors?: {
    origin: string | string[]
    credentials?: boolean
  }
  /** Max levels of child issue nesting. Default: 1 (children allowed, grandchildren not). */
  maxChildIssueDepth?: number
  registration?: RegistrationConfig
  /**
   * Express "trust proxy" setting. Controls how many proxy hops are trusted
   * when deriving req.ip (used for rate-limit keying). Default: 1.
   * Set to the number of hops in your chain (e.g. 2 for Cloudflare → ALB),
   * or false when not behind a proxy.
   */
  trustProxy?: boolean | number | string
}

export interface MeridianConfig {
  projectConfig: ProjectConfig
  modules?: ModuleConfig[]
  plugins?: PluginConfig[]
  admin?: AdminConfig
}

export interface ModuleConfig {
  resolve: string | ModuleDefinition
  options?: Record<string, unknown>
}

export interface PluginConfig {
  resolve: string
  options?: Record<string, unknown>
  disableSubscribers?: string[]
}

export interface AdminConfig {
  disable?: boolean
  path?: string
  /** Port for the admin dashboard static server (default: 5174) */
  port?: number
  /** Custom app name shown on login/register pages (default: "Meridian") */
  appName?: string
  /** URL for a custom logo image shown on login/register pages */
  logoUrl?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants — canonical string values, replacing scattered magic strings
// ─────────────────────────────────────────────────────────────────────────────

/** System JWT roles. `super-admin`/`admin` are org-wide privileged roles. */
export const ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  MEMBER: "member",
} as const
export type Role = (typeof ROLES)[keyof typeof ROLES]

/** Roles with org-wide privileged access (see access-control pattern). */
export const PRIVILEGED_ROLES: readonly string[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN]

/** Project-scoped membership roles. */
export const PROJECT_ROLES = {
  MANAGER: "manager",
  MEMBER: "member",
  VIEWER: "viewer",
} as const

/** Canonical domain event names emitted on the event bus. */
export const EVENTS = {
  PROJECT_CREATED: "project.created",
  PROJECT_TRANSFERRED: "project.transferred",
  ISSUE_CREATED: "issue.created",
  ISSUE_STATUS_CHANGED: "issue.status_changed",
  ISSUE_ASSIGNED: "issue.assigned",
  ISSUE_MENTIONED: "issue.mentioned",
  SPRINT_COMPLETED: "sprint.completed",
  COMMENT_CREATED: "comment.created",
  PROJECT_ACCESS_REQUESTED: "project.access_requested",
  PROJECT_ACCESS_REQUEST_RESOLVED: "project.access_request_resolved",
  PROJECT_ACCESS_REQUEST_CANCELLED: "project.access_request_cancelled",
  PROJECT_MEMBER_ADDED: "project.member_added",
  WORKSPACE_ACCESS_REQUESTED: "workspace.access_requested",
  WORKSPACE_ACCESS_REQUEST_RESOLVED: "workspace.access_request_resolved",
  WORKSPACE_ACCESS_REQUEST_CANCELLED: "workspace.access_request_cancelled",
  WORKSPACE_MEMBER_ADDED: "workspace.member_added",
  WORKSPACE_MEMBER_INVITED: "workspace.member_invited",
  REGISTRATION_OTP_REQUESTED: "registration.otp_requested",
  PASSWORD_OTP_REQUESTED: "password.otp_requested",
  PASSWORD_RESET_REQUESTED: "password.reset_requested",
} as const
export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

/** Valid values for a project health update's `health` field. */
export const HEALTH_STATUSES = ["on_track", "delayed", "on_hold", "completed"] as const
export type HealthStatus = (typeof HEALTH_STATUSES)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Event Bus
// ─────────────────────────────────────────────────────────────────────────────

export interface EventMessage<T = unknown> {
  name: string
  data: T
  metadata?: Record<string, unknown>
}

export interface IEventBus {
  emit<T>(event: EventMessage<T> | EventMessage<T>[]): Promise<void>
  subscribe(eventName: string, handler: SubscriberFn): void
  unsubscribe(eventName: string, handler: SubscriberFn): void
  close?(): Promise<void>
}

export type SubscriberFn<T = unknown> = (args: SubscriberArgs<T>) => Promise<void>

export interface SubscriberArgs<T = unknown> {
  event: EventMessage<T>
  container: MeridianContainer
}

export interface SubscriberConfig {
  event: string | string[]
  context?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface StepConfig {
  name: string
  async?: boolean
  retries?: number
  timeout?: number
}

export interface StepContext {
  container: MeridianContainer
  metadata?: Record<string, unknown>
}

export interface WorkflowConfig {
  name: string
  retentionTime?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduler
// ─────────────────────────────────────────────────────────────────────────────

export interface ScheduledJobConfig {
  name: string
  schedule: string | { interval: number }
  numberOfExecutions?: number
}

export type ScheduledJobFn = (container: MeridianContainer) => Promise<void>

export interface IScheduler {
  register(config: ScheduledJobConfig, fn: () => Promise<void>): Promise<void>
  close(): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP / Express
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string
  workspaceId: string
  roles: string[]
  permissions: string[]
}

// Augmented Express request — actual implementation in @meridianjs/framework
export interface MeridianRequestBase {
  scope: MeridianContainer
  user?: AuthenticatedUser
}

// ─────────────────────────────────────────────────────────────────────────────
// Logger
// ─────────────────────────────────────────────────────────────────────────────

export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
  debug(message: string, meta?: Record<string, unknown>): void
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Enums
// ─────────────────────────────────────────────────────────────────────────────

export type IssueType = "bug" | "feature" | "task" | "epic" | "story"

export type IssuePriority = "urgent" | "high" | "medium" | "low" | "none"

export type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "cancelled"

export type ProjectVisibility = "private" | "public" | "workspace"

export type ProjectStatus = "active" | "archived" | "paused"

export type SprintStatus = "planned" | "active" | "completed"

export type NotificationChannel = "in_app" | "email" | "push"

export type WorkspacePlan = "free" | "pro" | "enterprise"

export type TeamRole = "admin" | "member" | "guest"

// ─────────────────────────────────────────────────────────────────────────────
// Module Link
// ─────────────────────────────────────────────────────────────────────────────

export interface LinkableEntry {
  tableName: string
  primaryKey: string
}

export interface LinkEndpoint {
  linkable: LinkableEntry
  isList?: boolean
  deleteCascades?: boolean
  field?: string
}

export interface LinkDefinition {
  left: LinkEndpoint
  right: LinkEndpoint
  extraColumns?: Record<string, { type: string }>
  readOnly?: boolean
  linkTableName: string
  entryPoint: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Query (link traversal)
// ─────────────────────────────────────────────────────────────────────────────

export interface QueryGraphOptions {
  entity: string
  fields: string[]
  filters?: Record<string, unknown>
  pagination?: { limit?: number; offset?: number }
}

export interface IQuery {
  graph<T = unknown>(options: QueryGraphOptions): Promise<{ data: T[] }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

export interface IStorageProvider {
  /** Upload a file buffer to the given sub-directory. Returns the public URL and storage key. */
  upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    subDir: string
  ): Promise<{ url: string; key: string }>

  /** Delete a file by its public URL or storage key. */
  delete(urlOrKey: string): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Email
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailSendOptions {
  to: string
  subject: string
  html?: string
  text?: string
}

export interface IEmailService {
  send(options: EmailSendOptions): Promise<void>
}

export interface EmailTemplateOverride {
  subject?: string
  text?: string
  html?: string
}

export interface IEmailTemplateService {
  /** Return an override object for the given event + contextual data, or null to use defaults. */
  render(event: string, data: unknown): EmailTemplateOverride | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin
// ─────────────────────────────────────────────────────────────────────────────

export interface PluginRegistrationContext {
  container: MeridianContainer
  pluginOptions: Record<string, unknown>
  addModule(config: ModuleConfig): Promise<void>
}

export type PluginRegisterFn = (ctx: PluginRegistrationContext) => Promise<void>
