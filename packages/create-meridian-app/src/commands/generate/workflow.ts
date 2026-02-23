import path from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import { renderWorkflow } from "../../templates/index.js"
import { writeFile, toPascalCase, toKebabCase, findProjectRoot } from "../../utils.js"

export async function generateWorkflow(name: string): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  if (!name) {
    console.error(chalk.red("  ✖ Workflow name is required. Usage: meridian generate workflow <name>"))
    process.exit(1)
  }

  const kebab = toKebabCase(name)
  const pascal = toPascalCase(kebab)

  const filePath = path.join(rootDir, "src", "workflows", `${kebab}.ts`)

  if (existsSync(filePath)) {
    console.error(chalk.red(`  ✖ Workflow already exists: src/workflows/${kebab}.ts`))
    process.exit(1)
  }

  const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1)
  await writeFile(filePath, renderWorkflow(kebab, pascal))

  console.log(chalk.green(`  ✓ Generated workflow: src/workflows/${kebab}.ts`))
  console.log()
  console.log("  Usage:")
  console.log(chalk.dim(`    import { ${camel}Workflow } from "./workflows/${kebab}.js"`))
  console.log(chalk.dim(`    const { result } = await ${camel}Workflow(req.scope).run({ input: {...} })`))
}
