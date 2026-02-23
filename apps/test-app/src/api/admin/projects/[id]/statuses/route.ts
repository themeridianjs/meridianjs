import type { Response } from "express"

/** Slugify a status name → URL-safe key, e.g. "In Progress" → "in_progress" */
function toKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export const GET = async (req: any, res: Response) => {
  const { id: projectId } = req.params
  const svc = req.scope.resolve("projectModuleService") as any
  const statuses = await svc.listStatusesByProject(projectId)
  res.json({ statuses })
}

export const POST = async (req: any, res: Response) => {
  const { id: projectId } = req.params
  const { name, color, category } = req.body

  if (!name || !color || !category) {
    res.status(400).json({ error: { message: "name, color, and category are required" } })
    return
  }

  const svc = req.scope.resolve("projectModuleService") as any

  // position = current max + 1
  const existing = await svc.listStatusesByProject(projectId)
  const position = existing.length > 0 ? Math.max(...existing.map((s: any) => s.position)) + 1 : 0

  const status = await svc.createProjectStatus({
    project_id: projectId,
    name,
    key: toKey(name),
    color,
    category,
    position,
  })

  res.status(201).json({ status })
}
