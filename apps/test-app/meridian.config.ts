import { defineConfig } from "@meridianjs/framework"

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "postgresql://arjusmoon@localhost:5432/meridian_test",
    jwtSecret: process.env.JWT_SECRET ?? "super-secret-jwt-key-for-testing-only",
    httpPort: 9000,
    maxChildIssueDepth: 3
  },
  admin: {
    appName: "Meridian PM Tool",
    logoUrl: "/uploads/logo.jpeg",
  },
  modules: [
    // Infrastructure (optional — swap for @meridianjs/event-bus-redis in production)
    { resolve: "@meridianjs/event-bus-local" },
    { resolve: "@meridianjs/job-queue-local" },
    // Local test module (Phase 1 smoke test)
    { resolve: "./src/modules/hello-module/index.ts" },
    // Core domain modules are automatically loaded by the @meridianjs/meridian plugin
    {
      resolve: "@meridianjs/email-ses",
      options: {
        fromAddress: process.env.EMAIL_FROM ?? "no-reply@arjusmoon.com",
        region: process.env.SES_REGION ?? process.env.S3_REGION ?? "ap-south-1",
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    },
    // { 
    //   resolve: "@meridianjs/email-sendgrid", 
    //   options: { 
    //     apiKey: process.env.SENDGRID_API_KEY, 
    //     fromAddress: process.env.EMAIL_FROM_ADDRESS ?? "no-reply@arjusmoon.com" 
    //   } 
    // },
    // { 
    //   resolve: "@meridianjs/email-resend", 
    //   options: { 
    //     apiKey: process.env.RESEND_API_KEY, 
    //     fromAddress: process.env.EMAIL_FROM_ADDRESS ?? "no-reply@arjusmoon.com" 
    //   } 
    // },
    {
      resolve: "@meridianjs/storage-s3",
      options: {
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION ?? "eu-west-2",
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
        cloudfrontUrl: process.env.CLOUDFRONT_URL,
        // endpoint: process.env.S3_ENDPOINT,   // for MinIO / localstack
      },
    },
    {
      resolve: "@meridianjs/google-oauth",
      options: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:9000/auth/google/callback",
        frontendUrl: "http://localhost:3000",
      }
    },
  ],
  plugins: [
    // Default meridian routes/workflows/links/subscribers
    { resolve: "@meridianjs/meridian" },
  ],
})
