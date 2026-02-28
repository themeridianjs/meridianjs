import type { Response } from "express"
import fs from "node:fs/promises"
import path from "node:path"

export const DELETE = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const repo = req.scope.resolve("attachmentRepository") as any
  const attachment = await repo.findOne({ id: req.params.attachmentId })
  if (!attachment) {
    res.status(404).json({ error: { message: "Attachment not found" } })
    return
  }

  // Verify the attachment belongs to the issue referenced in the URL (IDOR cross-reference)
  if (attachment.issue_id !== req.params.id) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }

  // Verify caller uploaded the attachment or has manager/admin role
  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin") || roles.includes("manager")
  if (!isPrivileged && attachment.uploader_id !== req.user?.id) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }

  const rootDir = req.scope.resolve("config")?.rootDir ?? process.cwd()
  const uploadsDir = path.join(rootDir, "uploads", "issue-attachments") + path.sep
  const filePath = path.join(rootDir, "uploads", "issue-attachments", attachment.filename)

  // Path traversal guard: resolved path must be within uploads dir
  const resolvedPath = path.resolve(filePath)
  if (!resolvedPath.startsWith(uploadsDir)) {
    res.status(400).json({ error: { message: "Invalid attachment path" } })
    return
  }

  await issueService.deleteAttachment(req.params.attachmentId)
  await fs.unlink(resolvedPath).catch(() => {})
  res.json({ attachment })
}
