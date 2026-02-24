/**
 * All scaffold templates are embedded as strings so the CLI bundle is
 * self-contained (no extra file-copy step needed after npm install).
 */

export interface ProjectTemplateVars {
  name: string          // e.g. "my-app"
  databaseUrl: string   // e.g. "postgresql://..."
  httpPort: number
  dashboardPort: number
  dashboard: boolean
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
        start: "node --import tsx/esm src/main.ts",
        "db:migrate": "meridian db:migrate",
        "db:generate": "meridian db:generate",
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
      },
      devDependencies: {
        "create-meridian-app": "latest",
        typescript: "^5.4.0",
        tsx: "^4.0.0",
        "@types/node": "^22.0.0",
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
      exclude: ["node_modules", "dist"],
    },
    null,
    2
  )
}

export function renderMeridianConfig(vars: ProjectTemplateVars): string {
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
    { resolve: "@meridianjs/event-bus-local" },
    { resolve: "@meridianjs/user" },
    { resolve: "@meridianjs/workspace" },
    { resolve: "@meridianjs/auth" },
    { resolve: "@meridianjs/project" },
    { resolve: "@meridianjs/issue" },
    { resolve: "@meridianjs/sprint" },
    { resolve: "@meridianjs/activity" },
    { resolve: "@meridianjs/notification" },
    { resolve: "@meridianjs/invitation" },
    { resolve: "@meridianjs/workspace-member" },
    { resolve: "@meridianjs/team-member" },
    { resolve: "@meridianjs/project-member" },
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

const app = await bootstrap({ rootDir })
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
  return `# Copy this file to .env and fill in your values
DATABASE_URL=${vars.databaseUrl}
PORT=${vars.httpPort}
JWT_SECRET=changeme-replace-in-production
${vars.dashboard ? `DASHBOARD_PORT=${vars.dashboardPort}` : ""}
`.trimEnd() + "\n"
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
  links/               Cross-module link definitions
\`\`\`

## Extending Meridian

See the [Meridian documentation](https://github.com/meridian/meridian) for guides on:
- Creating custom modules
- Building workflows
- Writing event subscribers
- Scheduling background jobs
- Building plugins
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
