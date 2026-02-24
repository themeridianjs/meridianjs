import type { Response } from "express"

function toKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}

export const GET = async (req: any, res: Response) => {
  const svc = req.scope.resolve("projectModuleService") as any
  const statuses = await svc.listStatusesByProject(req.params.id)
  res.json({ statuses })
}

export const POST = async (req: any, res: Response) => {
  const { name, color, category } = req.body
  if (!name || !color || !category) {
    res.status(400).json({ error: { message: "name, color, and category are required" } })
    return
  }
  const svc = req.scope.resolve("projectModuleService") as any
  const existing = await svc.listStatusesByProject(req.params.id)
  const position = existing.length > 0 ? Math.max(...existing.map((s: any) => s.position)) + 1 : 0
  const status = await svc.createProjectStatus({
    project_id: req.params.id, name, key: toKey(name), color, category, position,
  })
  res.status(201).json({ status })
}
