import type { Response } from "express"
import { processUpload } from "../../../../../utils/upload.js"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const attachments = await issueService.listAttachmentsByIssue(req.params.id)
  res.json({ attachments })
}

export const POST = async (req: any, res: Response) => {
  const upload = await processUpload(req, res, "file", "issue-attachments")
  if (!upload) {
    res.status(400).json({ error: { message: "No file uploaded. Use multipart/form-data with field name 'file'." } })
    return
  }

  const issueService = req.scope.resolve("issueModuleService") as any
  const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
  if (!issue) { res.status(404).json({ error: { message: "Issue not found." } }); return }

  const attachment = await issueService.createAttachment({
    issue_id: req.params.id,
    comment_id: req.body?.comment_id || null,
    filename: upload.filename,
    original_name: upload.originalName,
    mime_type: upload.mimetype,
    size: upload.size,
    url: upload.url,
    uploader_id: req.user?.id ?? "system",
    workspace_id: issue.workspace_id,
  })
  res.status(201).json({ attachment })
}
