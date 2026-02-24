// ─────────────────────────────────────────────────────────────────────────────
// Core Container & Dependency Injection
// ─────────────────────────────────────────────────────────────────────────────

export interface MeridianContainer {
  resolve<T = unknown>(token: string): T
  register(registrations: Record<string, unknown>): void
  createScope(): MeridianContainer
}

// ─────────────────────────────────────────────────────────────────────────────
// Module System
// ─────────────────────────────────────────────────────────────────────────────

export interface ModuleDefinition {
  key: string
  service: new (...args: any[]) => IModuleService
  models?: unknown[]
  loaders?: LoaderFn[]
  linkable?: LinkableConfig
}

export interface IModuleService {
  // Intentionally permissive — services may have any shape
  [method: string]: any
}

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
}

export interface AdminConfig {
  disable?: boolean
  path?: string
  /** Port for the admin dashboard static server (default: 5174) */
  port?: number
}

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
// Plugin
// ─────────────────────────────────────────────────────────────────────────────

export interface PluginRegistrationContext {
  container: MeridianContainer
  pluginOptions: Record<string, unknown>
  addModule(config: ModuleConfig): Promise<void>
}

export type PluginRegisterFn = (ctx: PluginRegistrationContext) => Promise<void>
