import path from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import { renderSubscriber } from "../../templates/index.js"
import { writeFile, toKebabCase, findProjectRoot } from "../../utils.js"

export async function generateSubscriber(eventName: string): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  if (!eventName) {
    console.error(chalk.red("  ✖ Event name is required. Usage: meridian generate subscriber <event>"))
    process.exit(1)
  }

  // e.g. "issue.created" → "issue-created"
  const fileName = toKebabCase(eventName.replace(/\./g, "-"))
  const filePath = path.join(rootDir, "src", "subscribers", `${fileName}.ts`)

  if (existsSync(filePath)) {
    console.error(chalk.red(`  ✖ Subscriber already exists: src/subscribers/${fileName}.ts`))
    process.exit(1)
  }

  await writeFile(filePath, renderSubscriber(eventName))

  console.log(chalk.green(`  ✓ Generated subscriber: src/subscribers/${fileName}.ts`))
  console.log()
  console.log("  Listens for event:")
  console.log(chalk.dim(`    "${eventName}"`))
  console.log()
  console.log("  The file is auto-loaded by the framework on next dev restart.")
}
