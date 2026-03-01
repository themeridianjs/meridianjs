import { defineConfig } from "@meridianjs/framework"

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "postgresql://arjusmoon@localhost:5432/meridian_test",
    jwtSecret: process.env.JWT_SECRET ?? "super-secret-jwt-key-for-testing-only",
    httpPort: 9000,
  },
  modules: [
    // Infrastructure (optional — swap for @meridianjs/event-bus-redis in production)
    { resolve: "@meridianjs/event-bus-local" },
    { resolve: "@meridianjs/job-queue-local" },
    // Local test module (Phase 1 smoke test)
    { resolve: "./src/modules/hello-module/index.ts" },
    // Core domain modules are automatically loaded by the @meridianjs/meridian plugin
    {
      resolve: "@meridianjs/storage-s3",
      options: {
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION ?? "eu-west-2",
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        cloudfrontUrl: process.env.CLOUDFRONT_URL,
        // endpoint: process.env.S3_ENDPOINT,   // for MinIO / localstack
      },
    },
  ],
  plugins: [
    // Default meridian routes/workflows/links/subscribers
    { resolve: "@meridianjs/meridian" },
  ],
})
