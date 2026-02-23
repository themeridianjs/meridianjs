import type { Response } from "express"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..", "..", "..", "..", "..", "..", "..", "..")

export const DELETE = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any

  const attachment = await issueService.deleteAttachment(req.params.attachmentId)

  // Remove the file from disk — non-fatal if already gone
  const filePath = path.join(rootDir, "uploads", "issue-attachments", attachment.filename)
  await fs.unlink(filePath).catch(() => {})

  res.json({ attachment })
}
