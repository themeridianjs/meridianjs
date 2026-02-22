import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0

  const [workspaces, count] = await workspaceService.listAndCountWorkspaces({}, { limit, offset })
  res.json({ workspaces, count, limit, offset })
}

export const POST = async (req: any, res: Response) => {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const { name, plan } = req.body

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: { message: "name is required" } })
    return
  }

  const slug = workspaceService.generateSlug(name.trim())
  const workspace = await workspaceService.createWorkspace({
    name: name.trim(),
    slug,
    plan: plan ?? "free",
  })
  res.status(201).json({ workspace })
}
