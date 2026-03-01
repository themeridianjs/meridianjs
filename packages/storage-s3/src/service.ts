import { randomUUID } from "node:crypto"
import path from "node:path"
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import type { IStorageProvider, MeridianContainer } from "@meridianjs/types"
import type { S3StorageOptions } from "./types.js"

export class S3StorageService implements IStorageProvider {
  private readonly client: S3Client
  private readonly options: S3StorageOptions
  private readonly publicBaseUrl: string

  constructor(container: MeridianContainer) {
    const opts = container.resolve("moduleOptions") as S3StorageOptions

    if (!opts?.bucket) {
      throw new Error(
        "[@meridianjs/storage-s3] Missing required option: 'bucket'. " +
        "Add bucket and region to your storage-s3 module config."
      )
    }
    if (!opts?.region) {
      throw new Error(
        "[@meridianjs/storage-s3] Missing required option: 'region'. " +
        "Add region to your storage-s3 module config."
      )
    }

    this.options = opts

    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region: opts.region,
    }
    if (opts.endpoint) {
      clientConfig.endpoint = opts.endpoint
      clientConfig.forcePathStyle = true
    }
    if (opts.accessKeyId && opts.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
      }
    }

    this.client = new S3Client(clientConfig)

    this.publicBaseUrl = (
      opts.cloudfrontUrl ??
      opts.baseUrl ??
      `https://${opts.bucket}.s3.${opts.region}.amazonaws.com`
    ).replace(/\/$/, "")
  }

  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    subDir: string
  ): Promise<{ url: string; key: string }> {
    const ext = path.extname(file.originalname)
    const key = `${subDir}/${randomUUID()}${ext}`

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    )

    return { url: `${this.publicBaseUrl}/${key}`, key }
  }

  async delete(urlOrKey: string): Promise<void> {
    let key: string
    if (urlOrKey.startsWith("http")) {
      key = urlOrKey.replace(`${this.publicBaseUrl}/`, "")
    } else {
      key = urlOrKey
    }

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      })
    )
  }
}
