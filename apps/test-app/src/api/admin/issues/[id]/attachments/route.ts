import type { Response } from "express"
import { upload } from "../../../../../utils/upload.js"

/** Run multer middleware as a promise so it fits the async handler pattern. */
function runMulter(req: any, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const attachments = await issueService.listAttachmentsByIssue(req.params.id)
  res.json({ attachments })
}

export const POST = async (req: any, res: Response) => {
  await runMulter(req, res)

  if (!req.file) {
    res.status(400).json({ error: { message: "No file uploaded. Use multipart/form-data with field name 'file'." } })
    return
  }

  const issueService = req.scope.resolve("issueModuleService") as any
  const user = req.user as any

  // Verify the issue exists
  const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
  if (!issue) {
    res.status(404).json({ error: { message: "Issue not found." } })
    return
  }

  const comment_id: string | null = req.body?.comment_id || null

  const attachment = await issueService.createAttachment({
    issue_id: req.params.id,
    comment_id,
    filename: req.file.filename,
    original_name: req.file.originalname,
    mime_type: req.file.mimetype,
    size: req.file.size,
    url: `/uploads/issue-attachments/${req.file.filename}`,
    uploader_id: user?.id ?? "system",
    workspace_id: issue.workspace_id,
  })

  res.status(201).json({ attachment })
}
