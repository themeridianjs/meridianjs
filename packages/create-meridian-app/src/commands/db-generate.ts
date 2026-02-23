import path from "node:path"
import fs from "node:fs/promises"
import chalk from "chalk"
import { findProjectRoot } from "../utils.js"

export async function runDbGenerate(migrationName: string): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  if (!migrationName) {
    console.error(chalk.red("  ✖ Migration name is required. Usage: meridian db:generate <name>"))
    process.exit(1)
  }

  // Sanitize migration name: snake_case
  const safeName = migrationName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14) // YYYYMMDDHHmmss

  const fileName = `${timestamp}_${safeName}.ts`
  const migrationsDir = path.join(rootDir, "src", "migrations")

  await fs.mkdir(migrationsDir, { recursive: true })

  const content = `/**
 * Migration: ${safeName}
 * Generated at: ${new Date().toISOString()}
 *
 * This file is a placeholder. Meridian uses MikroORM's updateSchema() by default.
 * For custom migration SQL, implement the up() and down() methods below and
 * run them via a custom script calling \`em.getMigrator().up()\`.
 */

export async function up(): Promise<void> {
  // Write your migration SQL here
}

export async function down(): Promise<void> {
  // Write your rollback SQL here
}
`

  const filePath = path.join(migrationsDir, fileName)
  await fs.writeFile(filePath, content, "utf-8")

  console.log(chalk.green(`  ✓ Created migration: src/migrations/${fileName}`))
  console.log()
  console.log(chalk.dim("  Note: Meridian auto-syncs schema on startup via updateSchema()."))
  console.log(chalk.dim("  Use this file for custom DDL that requires manual control."))
}
