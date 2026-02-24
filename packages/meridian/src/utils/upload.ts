import multer from "multer"
import path from "node:path"
import { randomUUID } from "node:crypto"

/**
 * Multer instance for issue attachment uploads.
 * Files are stored in <projectRoot>/uploads/issue-attachments/.
 * The upload directory must exist before the server starts.
 */
export function createUpload(uploadDir: string) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname)
      const base = path.basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 80)
      cb(null, `${randomUUID()}-${base}${ext}`)
    },
  })

  return multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })
}
