export interface S3StorageOptions {
  bucket: string
  region: string
  accessKeyId?: string
  secretAccessKey?: string
  /** MinIO / localstack / custom S3-compatible endpoint */
  endpoint?: string
  /** CloudFront distribution URL, e.g. "https://d1abc.cloudfront.net". Takes precedence over baseUrl. */
  cloudfrontUrl?: string
  /** Any other CDN base URL. cloudfrontUrl takes precedence if both are provided. */
  baseUrl?: string
}
