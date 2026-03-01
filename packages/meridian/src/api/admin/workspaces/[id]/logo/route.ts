import type { Response } from "express"
import path from "node:path"
import fs from "node:fs"
import { mkdirSync } from "node:fs"
import { requirePermission } from "@meridianjs/auth"
import { createUpload } from "../../../../../utils/upload.js"

function getUploadDir(req: any): string {
  const rootDir = req.scope.resolve("config")?.rootDir ?? process.cwd()
  const uploadDir = path.join(rootDir, "uploads", "workspace-logos")
  mkdirSync(uploadDir, { recursive: true })
  return uploadDir
}

export const POST = async (req: any, res: Response) => {
  requirePermission("workspace:update")(req, res, async () => {
    const uploadDir = getUploadDir(req)
    const upload = createUpload(uploadDir)

    await new Promise<void>((resolve, reject) => {
      upload.single("logo")(req, res, (err: any) => (err ? reject(err) : resolve()))
    })

    if (!req.file) {
      res.status(400).json({ error: { message: "No file uploaded. Use multipart/form-data with field name 'logo'." } })
      return
    }

    const workspaceService = req.scope.resolve("workspaceModuleService") as any
    const existing = await workspaceService.retrieveWorkspace(req.params.id).catch(() => null)
    if (!existing) {
      res.status(404).json({ error: { message: "Workspace not found." } })
      return
    }

    // Delete old logo file if present
    if (existing.logo_url) {
      const rootDir = req.scope.resolve("config")?.rootDir ?? process.cwd()
      const oldFilePath = path.join(rootDir, existing.logo_url)
      fs.unlink(oldFilePath, () => {})
    }

    const logo_url = `/uploads/workspace-logos/${req.file.filename}`
    const workspace = await workspaceService.updateWorkspace(req.params.id, { logo_url })
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

    if (existing.logo_url) {
      const rootDir = req.scope.resolve("config")?.rootDir ?? process.cwd()
      const filePath = path.join(rootDir, existing.logo_url)
      fs.unlink(filePath, () => {})
    }

    const workspace = await workspaceService.updateWorkspace(req.params.id, { logo_url: null })
    res.json({ workspace })
  })
}
