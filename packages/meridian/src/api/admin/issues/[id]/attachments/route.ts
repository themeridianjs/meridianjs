import type { Response } from "express"
import path from "node:path"
import { mkdirSync } from "node:fs"
import { createUpload } from "../../../../../utils/upload.js"

function getUploadDir(req: any): string {
  const rootDir = req.scope.resolve("config")?.rootDir ?? process.cwd()
  const uploadDir = path.join(rootDir, "uploads", "issue-attachments")
  mkdirSync(uploadDir, { recursive: true })
  return uploadDir
}

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const attachments = await issueService.listAttachmentsByIssue(req.params.id)
  res.json({ attachments })
}

export const POST = async (req: any, res: Response) => {
  const uploadDir = getUploadDir(req)
  const upload = createUpload(uploadDir)

  await new Promise<void>((resolve, reject) => {
    upload.single("file")(req, res, (err: any) => err ? reject(err) : resolve())
  })

  if (!req.file) {
    res.status(400).json({ error: { message: "No file uploaded. Use multipart/form-data with field name 'file'." } })
    return
  }

  const issueService = req.scope.resolve("issueModuleService") as any
  const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
  if (!issue) { res.status(404).json({ error: { message: "Issue not found." } }); return }

  const attachment = await issueService.createAttachment({
    issue_id: req.params.id, comment_id: req.body?.comment_id || null,
    filename: req.file.filename, original_name: req.file.originalname,
    mime_type: req.file.mimetype, size: req.file.size,
    url: `/uploads/issue-attachments/${req.file.filename}`,
    uploader_id: req.user?.id ?? "system", workspace_id: issue.workspace_id,
  })
  res.status(201).json({ attachment })
}
