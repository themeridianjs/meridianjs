#!/usr/bin/env node
/**
 * create-meridian-app
 *
 * Usage:
 *   npx create-meridian-app [project-name]
 *
 * This is the "create" entry point. It scaffolds a new Meridian project.
 */

import { runNew } from "./commands/new.js"

const projectName = process.argv[2]

// If the first argument looks like a flag, don't treat it as a project name
const name = projectName && !projectName.startsWith("-") ? projectName : undefined

runNew(name).catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
