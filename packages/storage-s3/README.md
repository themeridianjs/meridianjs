# @meridianjs/storage-s3

AWS S3 (and S3-compatible) file storage provider for MeridianJS. Used for issue attachment uploads. Registers a `storageProvider` in the DI container that implements the `IStorageProvider` interface.

## Installation

```bash
npm install @meridianjs/storage-s3
```

## Configuration

```typescript
// meridian.config.ts
export default defineConfig({
  modules: [
    {
      resolve: "@meridianjs/storage-s3",
      options: {
        bucket:          process.env.AWS_S3_BUCKET ?? "",
        region:          process.env.AWS_S3_REGION ?? "us-east-1",
        accessKeyId:     process.env.AWS_S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY ?? "",
        // cloudfrontUrl: process.env.AWS_CLOUDFRONT_URL,  // optional — for CDN URLs
        // endpoint:      process.env.AWS_S3_ENDPOINT,     // optional — for R2 / MinIO
      },
    },
  ],
})
```

Add to your `.env`:

```bash
AWS_S3_BUCKET=my-meridian-uploads
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=AKIA...
AWS_S3_SECRET_ACCESS_KEY=...
```

### Cloudflare R2 / MinIO

Set `endpoint` to your custom S3-compatible endpoint:

```bash
AWS_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

## Usage

The framework uses `storageProvider` automatically when handling file uploads. You can also use it directly:

```typescript
import type { IStorageProvider } from "@meridianjs/types"

const storage = container.resolve("storageProvider") as IStorageProvider

// Upload a file
const { url, key } = await storage.upload(
  {
    buffer:       fileBuffer,
    originalname: "screenshot.png",
    mimetype:     "image/png",
    size:         fileBuffer.length,
  },
  "issue-attachments"  // sub-directory within the bucket
)

// Delete a file by its URL or storage key
await storage.delete(url)
```

## Notes

- If `cloudfrontUrl` is set, returned `url` values use the CloudFront domain instead of the S3 URL.
- `delete()` accepts both the full URL and the storage key.
- When running on EC2/ECS with an IAM role, you can omit `accessKeyId` and `secretAccessKey`.

## License

MIT
