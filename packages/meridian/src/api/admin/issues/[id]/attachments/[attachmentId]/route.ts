import type { Response } from "express"
import fs from "node:fs/promises"
import path from "node:path"

export const DELETE = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const attachment = await issueService.deleteAttachment(req.params.attachmentId)
  const rootDir = req.scope.resolve("config")?.rootDir ?? process.cwd()
  const filePath = path.join(rootDir, "uploads", "issue-attachments", attachment.filename)
  await fs.unlink(filePath).catch(() => {})
  res.json({ attachment })
}
