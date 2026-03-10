import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"
import { processUpload, deleteUpload } from "../../../../../utils/upload.js"

async function assertWorkspaceAccess(req: any, res: Response): Promise<boolean> {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

  if (workspace?.is_private || !isPrivileged) {
    const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
    if (!membership) {
      res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
      return false
    }
  }
  return true
}

export const POST = async (req: any, res: Response) => {
  requirePermission("workspace:update")(req, res, async () => {
    if (!await assertWorkspaceAccess(req, res)) return

    const upload = await processUpload(req, res, "logo", "workspace-logos")
    if (!upload) {
      res.status(400).json({ error: { message: "No file uploaded. Use multipart/form-data with field name 'logo'." } })
      return
    }

    const workspaceService = req.scope.resolve("workspaceModuleService") as any
    const existing = await workspaceService.retrieveWorkspace(req.params.id).catch(() => null)
    if (!existing) {
      res.status(404).json({ error: { message: "Workspace not found." } })
      return
    }

    if (existing.logo_url) await deleteUpload(req, existing.logo_url)

    const workspace = await workspaceService.updateWorkspace(req.params.id, { logo_url: upload.url })
    res.json({ workspace })
  })
}

export const DELETE = async (req: any, res: Response) => {
  requirePermission("workspace:update")(req, res, async () => {
    if (!await assertWorkspaceAccess(req, res)) return

    const workspaceService = req.scope.resolve("workspaceModuleService") as any
    const existing = await workspaceService.retrieveWorkspace(req.params.id).catch(() => null)
    if (!existing) {
      res.status(404).json({ error: { message: "Workspace not found." } })
      return
    }

    if (existing.logo_url) await deleteUpload(req, existing.logo_url)
    const workspace = await workspaceService.updateWorkspace(req.params.id, { logo_url: null })
    res.json({ workspace })
  })
}
