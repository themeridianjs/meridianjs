/**
 * All scaffold templates are embedded as strings so the CLI bundle is
 * self-contained (no extra file-copy step needed after npm install).
 */

export type OptionalModuleId =
  | "google-oauth"
  | "email-sendgrid"
  | "email-resend"
  | "email-ses"
  | "storage-s3"

export interface ProjectTemplateVars {
  name: string          // e.g. "my-app"
  databaseUrl: string   // e.g. "postgresql://..."
  httpPort: number
  dashboardPort: number
  dashboard: boolean
  optionalModules: OptionalModuleId[]
  seedDemo: boolean
}

// ─── Project-level files ───────────────────────────────────────────────────

export function renderPackageJson(vars: ProjectTemplateVars): string {
  return JSON.stringify(
    {
      name: vars.name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: "meridian dev",
        build: "meridian build",
        start: "meridian dev",
        "db:migrate": "meridian db:migrate",
        "db:generate": "meridian db:generate",
        ...(vars.seedDemo ? { "seed:demo": "node --import tsx/esm src/scripts/seed-demo.ts" } : {}),
      },
      dependencies: {
        "@meridianjs/framework": "latest",
        "@meridianjs/framework-utils": "latest",
        "@meridianjs/types": "latest",
        "@meridianjs/event-bus-local": "latest",
        "@meridianjs/user": "latest",
        "@meridianjs/workspace": "latest",
        "@meridianjs/auth": "latest",
        "@meridianjs/project": "latest",
        "@meridianjs/issue": "latest",
        "@meridianjs/sprint": "latest",
        "@meridianjs/activity": "latest",
        "@meridianjs/notification": "latest",
        "@meridianjs/invitation": "latest",
        "@meridianjs/workspace-member": "latest",
        "@meridianjs/team-member": "latest",
        "@meridianjs/project-member": "latest",
        "@meridianjs/meridian": "latest",
        "dotenv": "^16.0.0",
        ...(vars.dashboard ? { "@meridianjs/admin-dashboard": "latest" } : {}),
        ...Object.fromEntries(
          vars.optionalModules.map((id) => [`@meridianjs/${id}`, "latest"])
        ),
      },
      devDependencies: {
        "create-meridian-app": "latest",
        typescript: "^5.4.0",
        tsx: "^4.0.0",
        "@types/node": "^22.0.0",
        "@types/express": "^5.0.0",
      },
    },
    null,
    2
  )
}

export function renderTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        lib: ["ES2022"],
        outDir: "dist",
        rootDir: "src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist", "src/admin"],
    },
    null,
    2
  )
}

// ─── Optional module config blocks ─────────────────────────────────────────

function renderOptionalModuleBlock(id: OptionalModuleId, vars: ProjectTemplateVars): string {
  switch (id) {
    case "google-oauth":
      return `    {
      resolve: "@meridianjs/google-oauth",
      options: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        callbackUrl: "http://localhost:${vars.httpPort}/auth/google/callback",
        frontendUrl: "http://localhost:${vars.dashboardPort}",
      },
    },`
    case "email-sendgrid":
      return `    {
      resolve: "@meridianjs/email-sendgrid",
      options: {
        apiKey: process.env.SENDGRID_API_KEY ?? "",
        fromAddress: process.env.EMAIL_FROM ?? "noreply@example.com",
      },
    },`
    case "email-resend":
      return `    {
      resolve: "@meridianjs/email-resend",
      options: {
        apiKey: process.env.RESEND_API_KEY ?? "",
        fromAddress: process.env.EMAIL_FROM ?? "noreply@example.com",
      },
    },`
    case "email-ses":
      return `    {
      resolve: "@meridianjs/email-ses",
      options: {
        fromAddress: process.env.EMAIL_FROM ?? "noreply@example.com",
        region: process.env.AWS_SES_REGION ?? "us-east-1",
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY ?? "",
      },
    },`
    case "storage-s3":
      return `    {
      resolve: "@meridianjs/storage-s3",
      options: {
        bucket: process.env.AWS_S3_BUCKET ?? "",
        region: process.env.AWS_S3_REGION ?? "us-east-1",
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY ?? "",
        // cloudfrontUrl: process.env.AWS_CLOUDFRONT_URL, // optional, for generating public URLs
        // endpoint: process.env.AWS_S3_ENDPOINT, // uncomment for R2 / MinIO
      },
    },`
  }
}

export function renderMeridianConfig(vars: ProjectTemplateVars): string {
  const optBlocks = vars.optionalModules
    .map((id) => renderOptionalModuleBlock(id, vars))
    .join("\n")

  return `import { defineConfig } from "@meridianjs/framework"
import dotenv from "dotenv"
dotenv.config()

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "${vars.databaseUrl}",
    httpPort: Number(process.env.PORT) || ${vars.httpPort},
    jwtSecret: process.env.JWT_SECRET ?? "changeme-replace-in-production",
  },
  admin: {
    port: Number(process.env.DASHBOARD_PORT) || ${vars.dashboardPort},
  },
  modules: [
    // Infrastructure — swap for @meridianjs/event-bus-redis in production
    { resolve: "@meridianjs/event-bus-local" },
    // Core domain modules are automatically loaded by the @meridianjs/meridian plugin${optBlocks ? `\n${optBlocks}` : ""}
  ],
  plugins: [
    { resolve: "@meridianjs/meridian" },
  ],
})
`
}

export function renderMainTs(): string {
  return `import { bootstrap } from "@meridianjs/framework"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"
import express from "express"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

// Ensure uploads directory exists
const uploadsDir = path.join(rootDir, "uploads", "issue-attachments")
fs.mkdirSync(uploadsDir, { recursive: true })

const app = await bootstrap({ rootDir })

// Serve uploaded files statically at /uploads/*
app.server.use("/uploads", express.static(path.join(rootDir, "uploads")))

await app.start()

process.on("SIGTERM", async () => {
  await app.stop()
  process.exit(0)
})

process.on("SIGINT", async () => {
  await app.stop()
  process.exit(0)
})
`
}

export function renderMiddlewares(): string {
  return `import { authenticateJWT } from "@meridianjs/auth"

export default {
  routes: [
    { matcher: "/admin", middlewares: [authenticateJWT] },
  ],
}
`
}

export function renderHelloRoute(): string {
  return `import type { Request, Response } from "express"

export const GET = async (_req: Request, res: Response) => {
  res.json({ message: "Hello from Meridian!", timestamp: new Date().toISOString() })
}
`
}

export function renderAuthRegisterRoute(): string {
  return `import { z } from "zod"
import type { Response } from "express"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
})

export const POST = async (req: any, res: Response) => {
  const result = registerSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      error: { message: "Validation error", details: result.error.flatten().fieldErrors },
    })
    return
  }

  const authService = req.scope.resolve("authModuleService") as any
  const response = await authService.register(result.data)
  res.status(201).json(response)
}
`
}

export function renderAuthLoginRoute(): string {
  return `import { z } from "zod"
import type { Response } from "express"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const POST = async (req: any, res: Response) => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      error: { message: "Validation error", details: result.error.flatten().fieldErrors },
    })
    return
  }

  const authService = req.scope.resolve("authModuleService") as any
  const response = await authService.login(result.data)
  res.json(response)
}
`
}

export function renderGitIgnore(): string {
  return `# Dependencies
node_modules/

# Build output
dist/

# Environment variables
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*

# Editor
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
`
}

export function renderEnvExample(vars: ProjectTemplateVars): string {
  const mods = vars.optionalModules
  const sections: string[] = []

  if (mods.includes("google-oauth")) {
    sections.push(`# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=`)
  }

  const hasEmail = mods.includes("email-sendgrid") || mods.includes("email-resend") || mods.includes("email-ses")
  if (hasEmail) {
    const emailLines = ["# Email", "EMAIL_FROM=noreply@example.com"]
    if (mods.includes("email-sendgrid")) emailLines.push("SENDGRID_API_KEY=")
    if (mods.includes("email-resend"))   emailLines.push("RESEND_API_KEY=")
    sections.push(emailLines.join("\n"))
  }

  if (mods.includes("storage-s3")) {
    sections.push(`# File storage (S3 / compatible)
AWS_S3_BUCKET=
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=
AWS_S3_SECRET_ACCESS_KEY=
# AWS_CLOUDFRONT_URL=  # optional, for generating public URLs
# AWS_S3_ENDPOINT=     # uncomment for R2 / MinIO`)
  }

  if (mods.includes("email-ses")) {
    sections.push(`# Email — AWS SES credentials
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=
AWS_SES_SECRET_ACCESS_KEY=`)
  }

  const optionalEnv = sections.length > 0 ? "\n" + sections.join("\n\n") : ""

  return `# Copy this file to .env and fill in your values
DATABASE_URL=${vars.databaseUrl}
PORT=${vars.httpPort}
JWT_SECRET=changeme-replace-in-production
${vars.dashboard ? `DASHBOARD_PORT=${vars.dashboardPort}\n# API_URL=https://api.yourdomain.com  # set this in production\n` : ""}${optionalEnv}`.trimEnd() + "\n"
}

export function renderReadme(vars: ProjectTemplateVars): string {
  return `# ${vars.name}

A Meridian application.

## Getting started

\`\`\`bash
# Install dependencies
npm install

# Set up your database
cp .env.example .env
# Edit .env with your database URL

# Sync database schema
npm run db:migrate

# Start the development server
npm run dev
\`\`\`

## Commands

| Command | Description |
|---|---|
| \`npm run dev\` | Start API server${vars.dashboard ? " + admin dashboard" : ""} |
| \`npm run build\` | Type-check the project |
| \`npm run db:migrate\` | Synchronize the database schema |
| \`npm run db:generate <name>\` | Generate a new migration file |${vars.dashboard ? "\n| `meridian serve-dashboard` | Serve the admin dashboard standalone |" : ""}

## Project structure

\`\`\`
src/
  main.ts              Entry point
  api/
    middlewares.ts     Route-level middleware configuration
    admin/             File-based API routes
  modules/             Custom domain modules
  workflows/           DAG workflows with compensation
  subscribers/         Event subscribers
  jobs/                Scheduled background jobs
  links/               Cross-module link definitions${vars.dashboard ? `
  admin/
    widgets/
      index.tsx        Dashboard widget extensions` : ""}
\`\`\`
${vars.dashboard ? `
## Admin UI extensions

Add custom React components to \`src/admin/widgets/index.tsx\` to inject them into the dashboard UI. They are compiled automatically when you run \`npm run dev\` and loaded by the dashboard at runtime.

Available zones: \`issue.details.before/after/sidebar\`, \`project.board.before/after\`, \`project.issues.before/after\`, \`project.timeline.before/after\`, \`project.sprints.before/after\`, \`workspace.settings.before/after\`.
` : ""}
## Extending Meridian

See the [Meridian documentation](https://github.com/meridian/meridian) for guides on:
- Creating custom modules
- Building workflows
- Writing event subscribers
- Scheduling background jobs
- Building plugins
`
}

// ─── Admin UI extension template ───────────────────────────────────────────

export function renderAdminWidgetsIndex(): string {
  return `import React from "react"

// Admin UI widget extensions — injected into the Meridian dashboard at runtime.
// Run \`meridian dev\` or \`meridian serve-dashboard\` to compile and load these.
//
// Available zones and their props:
//   "issue.details.before"      — { issue: Issue }
//   "issue.details.after"       — { issue: Issue }
//   "issue.details.sidebar"     — { issue: Issue }
//   "project.board.before"      — { projectId: string }
//   "project.board.after"       — { projectId: string }
//   "project.issues.before"     — { projectId: string }
//   "project.issues.after"      — { projectId: string }
//   "project.timeline.before"   — { projectId: string }
//   "project.timeline.after"    — { projectId: string }
//   "project.sprints.before"    — { projectId: string }
//   "project.sprints.after"     — { projectId: string }
//   "workspace.settings.before" — { workspaceId: string }
//   "workspace.settings.after"  — { workspaceId: string }
//
// Example:
//   function MyBanner({ projectId }: { projectId: string }) {
//     return (
//       <div className="mx-6 my-2 p-3 rounded border border-border text-sm">
//         Custom panel for project: {projectId}
//       </div>
//     )
//   }
//
//   export default [
//     { zone: "project.board.before", component: MyBanner },
//   ]

export default []
`
}

// ─── Module template ───────────────────────────────────────────────────────

export function renderModuleIndex(name: string, pascalName: string): string {
  return `import { Module } from "@meridianjs/framework-utils"
import { ${pascalName}ModuleService } from "./service.js"
import { ${pascalName} } from "./models/${name}.js"
import defaultLoader from "./loaders/default.js"

export default Module("${name}ModuleService", {
  service: ${pascalName}ModuleService,
  models: [${pascalName}],
  loaders: [defaultLoader],
  linkable: {
    ${name}: { tableName: "${name}", primaryKey: "id" },
  },
})
`
}

export function renderModuleLoader(name: string, pascalName: string): string {
  return `import { createModuleOrm, createRepository, dmlToEntitySchema } from "@meridianjs/framework-utils"
import type { LoaderOptions } from "@meridianjs/types"
import { ${pascalName} } from "../models/${name}.js"

const ${pascalName}Schema = dmlToEntitySchema(${pascalName})

export default async function defaultLoader({ container }: LoaderOptions): Promise<void> {
  const config = container.resolve("config") as any
  const orm = await createModuleOrm(
    [${pascalName}Schema],
    config.projectConfig.databaseUrl
  )
  const em = orm.em.fork()
  container.register({
    ${name}Repository: createRepository(em, "${name}"),
    ${name}Orm: orm,
  })
}
`
}

export function renderModuleModel(name: string, pascalName: string): string {
  return `import { model } from "@meridianjs/framework-utils"

export const ${pascalName} = model("${name}", {
  id: model.id(),
  name: model.text(),
  created_at: model.dateTime(),
  updated_at: model.dateTime(),
})
`
}

export function renderModuleService(name: string, pascalName: string): string {
  return `import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import { ${pascalName} } from "./models/${name}.js"

export class ${pascalName}ModuleService extends MeridianService({ ${pascalName} }) {
  constructor(container: MeridianContainer) {
    super(container)
  }

  // Add custom service methods here
}
`
}

// ─── Workflow template ─────────────────────────────────────────────────────

export function renderWorkflow(name: string, pascalName: string): string {
  // camelCase for the exported identifier, e.g. "sendNotificationWorkflow"
  const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1)
  return `import { createStep, createWorkflow, WorkflowResponse } from "@meridianjs/workflow-engine"
import type { MeridianContainer } from "@meridianjs/types"

interface ${pascalName}WorkflowInput {
  // Define your input shape here
}

const ${camelName}Step = createStep(
  "${name}-step",
  async (input: ${pascalName}WorkflowInput, { container }: { container: MeridianContainer }) => {
    // Forward logic: implement your step here
    return { result: null }
  },
  async (_input: ${pascalName}WorkflowInput, _context: { container: MeridianContainer }) => {
    // Compensation logic: runs if a later step fails
  }
)

export const ${camelName}Workflow = createWorkflow(
  "${name}",
  (input: ${pascalName}WorkflowInput) => {
    const result = ${camelName}Step(input)
    return new WorkflowResponse(result)
  }
)
`
}

// ─── Subscriber template ───────────────────────────────────────────────────

export function renderSubscriber(eventName: string): string {
  return `import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

export default async function handler({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger") as any
  logger.info(\`Received event: \${event.name}\`, event.data)

  // Handle the event here
}

export const config: SubscriberConfig = {
  event: "${eventName}",
}
`
}

export function renderJob(name: string, schedule: string): string {
  return `import type { JobConfig } from "@meridianjs/types"

export default async function handler({ container }: { container: any }): Promise<void> {
  const logger = container.resolve("logger") as any
  logger.info("Running job: ${name}")

  // Add job logic here
}

export const config: JobConfig = {
  name: "${name}",
  schedule: "${schedule}", // cron expression
}
`
}

export function renderRoute(methods: string[]): string {
  const handlers = methods.map((m) => {
    const upper = m.toUpperCase()
    return `export const ${upper} = async (req: any, res: Response) => {
  // Handle ${upper} request
  res.json({ ok: true })
}`
  })
  return `import type { Response } from "express"

${handlers.join("\n\n")}
`
}

// ─── Demo seed script ──────────────────────────────────────────────────────

export function renderSeedScript(): string {
  return `import "dotenv/config"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { bootstrap } from "@meridianjs/framework"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "../..")

async function main() {
  console.log()
  console.log("  Seeding demo data...")

  const app = await bootstrap({ rootDir })
  const { container } = app

  const workspaceService = container.resolve("workspaceModuleService") as any
  const projectService   = container.resolve("projectModuleService")   as any
  const issueService     = container.resolve("issueModuleService")     as any
  const sprintService    = container.resolve("sprintModuleService")    as any
  const userService      = container.resolve("userModuleService")      as any

  // Optional author for comments
  const [users] = await userService.listAndCountUsers({}, { limit: 1 })
  const authorId: string | null = users[0]?.id ?? null
  if (!authorId) {
    console.log("  ℹ  No users found — comments will be skipped.")
    console.log("     Create a user first, then re-run 'npm run seed:demo' to seed comments.")
  }

  const now = new Date()
  const future = (days: number) => new Date(now.getTime() + days * 86_400_000)

  // ── helpers ──────────────────────────────────────────────────────────────

  async function seedStatuses(projectId: string) {
    const defaults = [
      { name: "Backlog",     key: "backlog",     color: "#94a3b8", category: "backlog",   position: 0 },
      { name: "Todo",        key: "todo",        color: "#64748b", category: "unstarted", position: 1 },
      { name: "In Progress", key: "in_progress", color: "#6366f1", category: "started",   position: 2 },
      { name: "In Review",   key: "in_review",   color: "#f59e0b", category: "started",   position: 3 },
      { name: "Done",        key: "done",        color: "#10b981", category: "completed", position: 4 },
      { name: "Cancelled",   key: "cancelled",   color: "#9ca3af", category: "cancelled", position: 5 },
    ]
    for (const s of defaults) {
      await projectService.createProjectStatus({ project_id: projectId, ...s })
    }
  }

  async function seedComment(issueId: string, body: string) {
    if (!authorId) return
    await issueService.createComment({ issue_id: issueId, author_id: authorId, body })
  }

  // ── Workspace 1: Acme Corp ───────────────────────────────────────────────

  const acme = await workspaceService.createWorkspace({ name: "Acme Corp", slug: "acme-corp" })

  // Project A: Website Redesign
  const siteProject = await projectService.createProject({
    workspace_id: acme.id,
    name: "Website Redesign",
    identifier: "SITE",
    color: "#6366f1",
  })
  await seedStatuses(siteProject.id)
  const siteSprint = await sprintService.createSprint({
    project_id: siteProject.id,
    workspace_id: acme.id,
    name: "Sprint 1",
    start_date: now,
    end_date: future(14),
  })
  await sprintService.startSprint(siteSprint.id)

  const siteHero = await issueService.createIssueInProject({
    project_id: siteProject.id,
    workspace_id: acme.id,
    title: "Redesign homepage hero section",
    type: "feature",
    priority: "high",
    status: "In Progress",
    sprint_id: siteSprint.id,
  })
  await issueService.createIssueInProject({
    project_id: siteProject.id,
    workspace_id: acme.id,
    title: "Design hero animation",
    type: "task",
    priority: "medium",
    status: "Todo",
    parent_id: siteHero.id,
  })
  await issueService.createIssueInProject({
    project_id: siteProject.id,
    workspace_id: acme.id,
    title: "Write hero copy",
    type: "task",
    priority: "low",
    status: "Todo",
    parent_id: siteHero.id,
  })
  await issueService.createIssueInProject({
    project_id: siteProject.id,
    workspace_id: acme.id,
    title: "Fix broken navigation links",
    type: "bug",
    priority: "urgent",
    status: "Done",
  })
  await issueService.createIssueInProject({
    project_id: siteProject.id,
    workspace_id: acme.id,
    title: "Implement contact form",
    type: "feature",
    priority: "medium",
    status: "In Progress",
  })
  await issueService.createIssueInProject({
    project_id: siteProject.id,
    workspace_id: acme.id,
    title: "Optimize images for web",
    type: "task",
    priority: "low",
    status: "Todo",
  })
  await issueService.createIssueInProject({
    project_id: siteProject.id,
    workspace_id: acme.id,
    title: "Add SEO meta tags",
    type: "task",
    priority: "medium",
    status: "Backlog",
  })
  await issueService.createIssueInProject({
    project_id: siteProject.id,
    workspace_id: acme.id,
    title: "Set up Google Analytics",
    type: "task",
    priority: "high",
    status: "Todo",
    sprint_id: siteSprint.id,
  })
  await seedComment(siteHero.id, "Started working on the hero section mockups in Figma.")
  await seedComment(siteHero.id, "Using a full-width video background for the hero. Need sign-off from marketing.")

  // Project B: Mobile App
  const appProject = await projectService.createProject({
    workspace_id: acme.id,
    name: "Mobile App",
    identifier: "APP",
    color: "#f59e0b",
  })
  await seedStatuses(appProject.id)
  const appSprint = await sprintService.createSprint({
    project_id: appProject.id,
    workspace_id: acme.id,
    name: "Sprint 1",
    start_date: now,
    end_date: future(14),
  })
  await sprintService.startSprint(appSprint.id)

  const appPush = await issueService.createIssueInProject({
    project_id: appProject.id,
    workspace_id: acme.id,
    title: "Implement push notifications",
    type: "feature",
    priority: "high",
    status: "In Progress",
    sprint_id: appSprint.id,
  })
  await issueService.createIssueInProject({
    project_id: appProject.id,
    workspace_id: acme.id,
    title: "iOS push setup",
    type: "task",
    priority: "medium",
    status: "Todo",
    parent_id: appPush.id,
  })
  await issueService.createIssueInProject({
    project_id: appProject.id,
    workspace_id: acme.id,
    title: "Android push setup",
    type: "task",
    priority: "medium",
    status: "Todo",
    parent_id: appPush.id,
  })
  const appCrash = await issueService.createIssueInProject({
    project_id: appProject.id,
    workspace_id: acme.id,
    title: "Fix crash on login screen",
    type: "bug",
    priority: "urgent",
    status: "In Review",
  })
  await issueService.createIssueInProject({
    project_id: appProject.id,
    workspace_id: acme.id,
    title: "Add dark mode support",
    type: "feature",
    priority: "medium",
    status: "Todo",
  })
  await issueService.createIssueInProject({
    project_id: appProject.id,
    workspace_id: acme.id,
    title: "Improve app launch time",
    type: "task",
    priority: "high",
    status: "In Progress",
  })
  await issueService.createIssueInProject({
    project_id: appProject.id,
    workspace_id: acme.id,
    title: "Write onboarding flow",
    type: "story",
    priority: "medium",
    status: "Backlog",
  })
  await issueService.createIssueInProject({
    project_id: appProject.id,
    workspace_id: acme.id,
    title: "Accessibility audit",
    type: "task",
    priority: "low",
    status: "Todo",
    sprint_id: appSprint.id,
  })
  await seedComment(appCrash.id, "Crash is reproducible on iOS 17.2 with biometric login enabled.")
  await seedComment(appCrash.id, "Root cause: null pointer on the auth token refresh callback. Fix in progress.")

  // ── Workspace 2: Starlight Labs ──────────────────────────────────────────

  const starlight = await workspaceService.createWorkspace({ name: "Starlight Labs", slug: "starlight-labs" })

  // Project C: Product Roadmap
  const roadmapProject = await projectService.createProject({
    workspace_id: starlight.id,
    name: "Product Roadmap",
    identifier: "STAR",
    color: "#10b981",
  })
  await seedStatuses(roadmapProject.id)
  const roadmapSprint = await sprintService.createSprint({
    project_id: roadmapProject.id,
    workspace_id: starlight.id,
    name: "Sprint 1",
    start_date: now,
    end_date: future(21),
  })
  await sprintService.startSprint(roadmapSprint.id)

  const roadmapOkr = await issueService.createIssueInProject({
    project_id: roadmapProject.id,
    workspace_id: starlight.id,
    title: "Define Q2 OKRs",
    type: "epic",
    priority: "high",
    status: "In Progress",
    sprint_id: roadmapSprint.id,
  })
  await issueService.createIssueInProject({
    project_id: roadmapProject.id,
    workspace_id: starlight.id,
    title: "Engineering OKRs",
    type: "task",
    priority: "high",
    status: "Todo",
    parent_id: roadmapOkr.id,
  })
  await issueService.createIssueInProject({
    project_id: roadmapProject.id,
    workspace_id: starlight.id,
    title: "Product OKRs",
    type: "task",
    priority: "high",
    status: "Todo",
    parent_id: roadmapOkr.id,
  })
  await issueService.createIssueInProject({
    project_id: roadmapProject.id,
    workspace_id: starlight.id,
    title: "User research interviews",
    type: "task",
    priority: "medium",
    status: "Done",
  })
  await issueService.createIssueInProject({
    project_id: roadmapProject.id,
    workspace_id: starlight.id,
    title: "Competitive analysis",
    type: "task",
    priority: "medium",
    status: "In Review",
  })
  await issueService.createIssueInProject({
    project_id: roadmapProject.id,
    workspace_id: starlight.id,
    title: "Draft product spec v1",
    type: "feature",
    priority: "high",
    status: "In Progress",
  })
  await issueService.createIssueInProject({
    project_id: roadmapProject.id,
    workspace_id: starlight.id,
    title: "Roadmap review with stakeholders",
    type: "task",
    priority: "medium",
    status: "Todo",
  })
  await issueService.createIssueInProject({
    project_id: roadmapProject.id,
    workspace_id: starlight.id,
    title: "Prioritize feature backlog",
    type: "task",
    priority: "low",
    status: "Backlog",
    sprint_id: roadmapSprint.id,
  })
  await seedComment(roadmapOkr.id, "Synced with leadership — focus areas are retention and activation for Q2.")
  await seedComment(roadmapOkr.id, "First draft of engineering OKRs shared in Notion. Review by EOW.")

  // Project D: Marketing Site
  const mktProject = await projectService.createProject({
    workspace_id: starlight.id,
    name: "Marketing Site",
    identifier: "MKT",
    color: "#ec4899",
  })
  await seedStatuses(mktProject.id)
  const mktSprint = await sprintService.createSprint({
    project_id: mktProject.id,
    workspace_id: starlight.id,
    name: "Sprint 1",
    start_date: now,
    end_date: future(7),
  })
  await sprintService.startSprint(mktSprint.id)

  const mktPricing = await issueService.createIssueInProject({
    project_id: mktProject.id,
    workspace_id: starlight.id,
    title: "Redesign pricing page",
    type: "feature",
    priority: "high",
    status: "In Progress",
    sprint_id: mktSprint.id,
  })
  await issueService.createIssueInProject({
    project_id: mktProject.id,
    workspace_id: starlight.id,
    title: "Update pricing copy",
    type: "task",
    priority: "medium",
    status: "Todo",
    parent_id: mktPricing.id,
  })
  await issueService.createIssueInProject({
    project_id: mktProject.id,
    workspace_id: starlight.id,
    title: "A/B test variants",
    type: "task",
    priority: "low",
    status: "Backlog",
    parent_id: mktPricing.id,
  })
  await issueService.createIssueInProject({
    project_id: mktProject.id,
    workspace_id: starlight.id,
    title: "Fix mobile layout issues",
    type: "bug",
    priority: "urgent",
    status: "In Review",
  })
  await issueService.createIssueInProject({
    project_id: mktProject.id,
    workspace_id: starlight.id,
    title: "Improve page load score",
    type: "task",
    priority: "high",
    status: "Todo",
  })
  await issueService.createIssueInProject({
    project_id: mktProject.id,
    workspace_id: starlight.id,
    title: "Add blog section",
    type: "feature",
    priority: "medium",
    status: "Backlog",
  })
  await issueService.createIssueInProject({
    project_id: mktProject.id,
    workspace_id: starlight.id,
    title: "Set up Hotjar",
    type: "task",
    priority: "low",
    status: "Todo",
  })
  await issueService.createIssueInProject({
    project_id: mktProject.id,
    workspace_id: starlight.id,
    title: "Write 3 launch blog posts",
    type: "task",
    priority: "medium",
    status: "In Progress",
    sprint_id: mktSprint.id,
  })
  await seedComment(mktPricing.id, "New pricing tiers approved by sales. Updating the copy now.")
  await seedComment(mktPricing.id, "Design review scheduled for Thursday. Figma link shared in Slack.")

  // ── Workspace 3: DevOps Team ─────────────────────────────────────────────

  const devops = await workspaceService.createWorkspace({ name: "DevOps Team", slug: "devops-team" })

  // Project E: Infrastructure
  const infraProject = await projectService.createProject({
    workspace_id: devops.id,
    name: "Infrastructure",
    identifier: "INFRA",
    color: "#64748b",
  })
  await seedStatuses(infraProject.id)
  const infraSprint = await sprintService.createSprint({
    project_id: infraProject.id,
    workspace_id: devops.id,
    name: "Sprint 1",
    start_date: now,
    end_date: future(14),
  })
  await sprintService.startSprint(infraSprint.id)

  const infraEks = await issueService.createIssueInProject({
    project_id: infraProject.id,
    workspace_id: devops.id,
    title: "Migrate to EKS",
    type: "epic",
    priority: "high",
    status: "In Progress",
    sprint_id: infraSprint.id,
  })
  await issueService.createIssueInProject({
    project_id: infraProject.id,
    workspace_id: devops.id,
    title: "Set up EKS cluster",
    type: "task",
    priority: "high",
    status: "In Progress",
    parent_id: infraEks.id,
  })
  await issueService.createIssueInProject({
    project_id: infraProject.id,
    workspace_id: devops.id,
    title: "Migrate services",
    type: "task",
    priority: "high",
    status: "Todo",
    parent_id: infraEks.id,
  })
  await issueService.createIssueInProject({
    project_id: infraProject.id,
    workspace_id: devops.id,
    title: "Implement secrets rotation",
    type: "feature",
    priority: "urgent",
    status: "In Review",
  })
  await issueService.createIssueInProject({
    project_id: infraProject.id,
    workspace_id: devops.id,
    title: "Add CloudWatch dashboards",
    type: "task",
    priority: "medium",
    status: "Todo",
  })
  await issueService.createIssueInProject({
    project_id: infraProject.id,
    workspace_id: devops.id,
    title: "Reduce AWS costs by 20%",
    type: "task",
    priority: "high",
    status: "Backlog",
  })
  await issueService.createIssueInProject({
    project_id: infraProject.id,
    workspace_id: devops.id,
    title: "Set up Datadog APM",
    type: "feature",
    priority: "medium",
    status: "Todo",
    sprint_id: infraSprint.id,
  })
  await issueService.createIssueInProject({
    project_id: infraProject.id,
    workspace_id: devops.id,
    title: "Document runbooks",
    type: "task",
    priority: "low",
    status: "Backlog",
  })
  await seedComment(infraEks.id, "EKS cluster provisioned in us-east-1. Starting service migration next week.")
  await seedComment(infraEks.id, "Need to resolve IAM role issues before migrating the auth service.")

  // Project F: CI/CD Pipeline
  const cicdProject = await projectService.createProject({
    workspace_id: devops.id,
    name: "CI/CD Pipeline",
    identifier: "CICD",
    color: "#8b5cf6",
  })
  await seedStatuses(cicdProject.id)
  const cicdSprint = await sprintService.createSprint({
    project_id: cicdProject.id,
    workspace_id: devops.id,
    name: "Sprint 1",
    start_date: now,
    end_date: future(14),
  })
  await sprintService.startSprint(cicdSprint.id)

  const cicdMatrix = await issueService.createIssueInProject({
    project_id: cicdProject.id,
    workspace_id: devops.id,
    title: "Add matrix builds for Node 18/20",
    type: "feature",
    priority: "high",
    status: "In Progress",
    sprint_id: cicdSprint.id,
  })
  await issueService.createIssueInProject({
    project_id: cicdProject.id,
    workspace_id: devops.id,
    title: "Node 18 build config",
    type: "task",
    priority: "medium",
    status: "Done",
    parent_id: cicdMatrix.id,
  })
  await issueService.createIssueInProject({
    project_id: cicdProject.id,
    workspace_id: devops.id,
    title: "Node 20 build config",
    type: "task",
    priority: "medium",
    status: "In Progress",
    parent_id: cicdMatrix.id,
  })
  await issueService.createIssueInProject({
    project_id: cicdProject.id,
    workspace_id: devops.id,
    title: "Flaky test investigation",
    type: "bug",
    priority: "high",
    status: "In Review",
  })
  await issueService.createIssueInProject({
    project_id: cicdProject.id,
    workspace_id: devops.id,
    title: "Add deploy preview environments",
    type: "feature",
    priority: "medium",
    status: "Todo",
  })
  await issueService.createIssueInProject({
    project_id: cicdProject.id,
    workspace_id: devops.id,
    title: "Cache npm dependencies",
    type: "task",
    priority: "medium",
    status: "Done",
    sprint_id: cicdSprint.id,
  })
  await issueService.createIssueInProject({
    project_id: cicdProject.id,
    workspace_id: devops.id,
    title: "Rollback automation",
    type: "feature",
    priority: "high",
    status: "Backlog",
  })
  await issueService.createIssueInProject({
    project_id: cicdProject.id,
    workspace_id: devops.id,
    title: "Pipeline documentation",
    type: "task",
    priority: "low",
    status: "Todo",
  })
  await seedComment(cicdMatrix.id, "Matrix strategy configured. Both Node 18 and 20 now tested on every PR.")
  await seedComment(cicdMatrix.id, "Node 20 build is failing on the integration test step — investigating.")

  console.log()
  console.log("  ✓ Demo data seeded successfully!")
  console.log()
  console.log("  Seeded:")
  console.log("    3 workspaces  (Acme Corp, Starlight Labs, DevOps Team)")
  console.log("    6 projects    (Website Redesign, Mobile App, Product Roadmap, Marketing Site, Infrastructure, CI/CD Pipeline)")
  console.log("    6 sprints     (1 per project, all active)")
  console.log("    50+ issues    (with child issues and various statuses)")
  if (authorId) {
    console.log("    12 comments   (2 per featured issue)")
  }
  console.log()

  process.exit(0)
}

main().catch((err) => {
  console.error()
  console.error("  ✖ Seeding failed:", err.message)
  console.error()
  process.exit(1)
})
`
}
