import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"
import { processUpload, deleteUpload } from "../../../../../utils/upload.js"

export const POST = async (req: any, res: Response) => {
  requirePermission("workspace:update")(req, res, async () => {
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
