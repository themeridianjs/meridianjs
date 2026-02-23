import path from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import {
  renderModuleIndex,
  renderModuleModel,
  renderModuleService,
} from "../../templates/index.js"
import { writeFile, toPascalCase, toKebabCase, findProjectRoot } from "../../utils.js"

export async function generateModule(name: string): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  if (!name) {
    console.error(chalk.red("  ✖ Module name is required. Usage: meridian generate module <name>"))
    process.exit(1)
  }

  const kebab = toKebabCase(name)        // e.g. "my-module"
  const pascal = toPascalCase(kebab)     // e.g. "MyModule"

  const moduleDir = path.join(rootDir, "src", "modules", kebab)

  if (existsSync(moduleDir)) {
    console.error(chalk.red(`  ✖ Module directory already exists: src/modules/${kebab}`))
    process.exit(1)
  }

  await writeFile(path.join(moduleDir, "index.ts"), renderModuleIndex(kebab, pascal))
  await writeFile(path.join(moduleDir, `models/${kebab}.ts`), renderModuleModel(kebab, pascal))
  await writeFile(path.join(moduleDir, "service.ts"), renderModuleService(kebab, pascal))

  console.log(chalk.green(`  ✓ Generated module: src/modules/${kebab}/`))
  console.log()
  console.log("  Files created:")
  console.log(chalk.dim(`    src/modules/${kebab}/index.ts`))
  console.log(chalk.dim(`    src/modules/${kebab}/models/${kebab}.ts`))
  console.log(chalk.dim(`    src/modules/${kebab}/service.ts`))
  console.log()
  console.log("  Next steps:")
  console.log(chalk.dim(`    1. Add the module to your meridian.config.ts:`))
  console.log(chalk.dim(`       { resolve: "./src/modules/${kebab}" }`))
  console.log(chalk.dim(`    2. Run \`npm run db:migrate\` to sync the schema`))
}
