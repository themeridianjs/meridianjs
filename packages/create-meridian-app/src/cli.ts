#!/usr/bin/env node
/**
 * meridian CLI
 *
 * Sub-commands:
 *   meridian dev                      — Start the development server (+ dashboard if installed)
 *   meridian build                    — Type-check the project
 *   meridian db:migrate               — Synchronize database schema
 *   meridian db:generate <name>       — Generate a migration file
 *   meridian serve-dashboard          — Serve the admin dashboard on port 5174
 *   meridian generate module <name>   — Scaffold a new module
 *   meridian generate workflow <name> — Scaffold a new workflow
 *   meridian new [project-name]       — Create a new project (same as npx create-meridian-app)
 */

import { Command } from "commander"
import { runNew } from "./commands/new.js"
import { runDev } from "./commands/dev.js"
import { runBuild } from "./commands/build.js"
import { runDbMigrate } from "./commands/db-migrate.js"
import { runDbGenerate } from "./commands/db-generate.js"
import { generateModule, generateWorkflow, generatePlugin } from "./commands/generate/index.js"
import { runServeDashboard } from "./commands/serve-dashboard.js"
import { runUserCreate } from "./commands/user-create.js"

const program = new Command()

program
  .name("meridian")
  .description("Meridian project management framework CLI")
  .version("0.1.0")

// ── new ───────────────────────────────────────────────────────────────────
program
  .command("new [project-name]")
  .description("Create a new Meridian project")
  .action((projectName?: string) => {
    runNew(projectName).catch((err: unknown) => {
      console.error(err)
      process.exit(1)
    })
  })

// ── dev ───────────────────────────────────────────────────────────────────
program
  .command("dev")
  .description("Start the development server")
  .action(() => {
    runDev().catch((err: unknown) => {
      console.error(err)
      process.exit(1)
    })
  })

// ── build ─────────────────────────────────────────────────────────────────
program
  .command("build")
  .description("Type-check the project")
  .action(() => {
    runBuild().catch((err: unknown) => {
      console.error(err)
      process.exit(1)
    })
  })

// ── db:migrate ────────────────────────────────────────────────────────────
program
  .command("db:migrate")
  .description("Synchronize the database schema (runs updateSchema on all modules)")
  .action(() => {
    runDbMigrate().catch((err: unknown) => {
      console.error(err)
      process.exit(1)
    })
  })

// ── db:generate ───────────────────────────────────────────────────────────
program
  .command("db:generate <name>")
  .description("Generate a new migration file")
  .action((name: string) => {
    runDbGenerate(name).catch((err: unknown) => {
      console.error(err)
      process.exit(1)
    })
  })

// ── serve-dashboard ───────────────────────────────────────────────────────
program
  .command("serve-dashboard")
  .description("Serve the admin dashboard as a static site")
  .option("-p, --port <port>", "Port to serve on", "5174")
  .action((options) => {
    runServeDashboard(Number(options.port)).catch((err: unknown) => {
      console.error(err)
      process.exit(1)
    })
  })

// ── user:create ───────────────────────────────────────────────────────────
program
  .command("user:create")
  .description("Create a new user with a specified role")
  .option("-e, --email <email>", "Email address")
  .option(
    "-r, --role <role>",
    "Role: super-admin | admin | moderator | member"
  )
  .action((options) => {
    runUserCreate({ email: options.email, role: options.role }).catch(
      (err: unknown) => {
        console.error(err)
        process.exit(1)
      }
    )
  })

// ── generate ──────────────────────────────────────────────────────────────
const generateCmd = program
  .command("generate")
  .alias("g")
  .description("Generate boilerplate files")

generateCmd
  .command("module <name>")
  .description("Scaffold a new module in src/modules/")
  .action((name: string) => {
    generateModule(name).catch((err: unknown) => {
      console.error(err)
      process.exit(1)
    })
  })

generateCmd
  .command("workflow <name>")
  .description("Scaffold a new workflow in src/workflows/")
  .action((name: string) => {
    generateWorkflow(name).catch((err: unknown) => {
      console.error(err)
      process.exit(1)
    })
  })

generateCmd
  .command("plugin <name>")
  .description("Scaffold a local plugin in src/plugins/")
  .action((name: string) => {
    generatePlugin(name).catch((err: unknown) => {
      console.error(err)
      process.exit(1)
    })
  })

program.parse(process.argv)
