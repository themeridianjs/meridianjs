import path from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import { renderJob } from "../../templates/index.js"
import { writeFile, toKebabCase, findProjectRoot } from "../../utils.js"

export async function generateJob(name: string, schedule: string): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  if (!name) {
    console.error(chalk.red("  ✖ Job name is required. Usage: meridian generate job <name>"))
    process.exit(1)
  }

  const kebab = toKebabCase(name)
  const filePath = path.join(rootDir, "src", "jobs", `${kebab}.ts`)

  if (existsSync(filePath)) {
    console.error(chalk.red(`  ✖ Job already exists: src/jobs/${kebab}.ts`))
    process.exit(1)
  }

  await writeFile(filePath, renderJob(kebab, schedule))

  console.log(chalk.green(`  ✓ Generated job: src/jobs/${kebab}.ts`))
  console.log()
  console.log("  Schedule:")
  console.log(chalk.dim(`    ${schedule}`))
  console.log()
  console.log("  The job is auto-loaded by the framework on next dev restart.")
}
