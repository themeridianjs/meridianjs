import multer from "multer"
import path from "node:path"
import fs from "node:fs"
import { mkdirSync } from "node:fs"
import { randomUUID } from "node:crypto"
import type { IStorageProvider } from "@meridianjs/types"

/**
 * Multer instance for disk-based file uploads.
 * Files are stored in the given uploadDir.
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

export interface UploadResult {
  url: string
  filename: string
  originalName: string
  mimetype: string
  size: number
}

/**
 * Handles file upload via S3 (if storageProvider is registered) or local disk.
 * Returns null if no file was included in the request.
 */
export async function processUpload(
  req: any,
  res: any,
  fieldName: string,
  subDir: string
): Promise<UploadResult | null> {
  let storageProvider: IStorageProvider | null = null
  try {
    storageProvider = req.scope.resolve("storageProvider") as IStorageProvider
  } catch {
    // storageProvider not registered — fall back to local disk
  }

  if (storageProvider) {
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })
    await new Promise<void>((resolve, reject) =>
      upload.single(fieldName)(req, res, (err: any) => (err ? reject(err) : resolve()))
    )
    if (!req.file) return null
    const { url, key } = await storageProvider.upload(req.file, subDir)
    return {
      url,
      filename: key,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    }
  } else {
    const rootDir = req.scope.resolve("config")?.rootDir ?? process.cwd()
    const uploadDir = path.join(rootDir, "uploads", subDir)
    mkdirSync(uploadDir, { recursive: true })
    const upload = createUpload(uploadDir)
    await new Promise<void>((resolve, reject) =>
      upload.single(fieldName)(req, res, (err: any) => (err ? reject(err) : resolve()))
    )
    if (!req.file) return null
    return {
      url: `/uploads/${subDir}/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    }
  }
}

/**
 * Deletes a file by URL/key via S3 or local disk. Fire-and-forget safe (swallows errors).
 */
export async function deleteUpload(req: any, urlOrKey: string): Promise<void> {
  let storageProvider: IStorageProvider | null = null
  try {
    storageProvider = req.scope.resolve("storageProvider") as IStorageProvider
  } catch {
    // storageProvider not registered — fall back to local disk
  }

  if (storageProvider) {
    await storageProvider.delete(urlOrKey).catch(() => {})
  } else {
    const rootDir = req.scope.resolve("config")?.rootDir ?? process.cwd()
    fs.unlink(path.join(rootDir, urlOrKey), () => {})
  }
}
