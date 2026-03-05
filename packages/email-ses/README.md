# @meridianjs/email-ses

[AWS SES](https://aws.amazon.com/ses/) email provider for MeridianJS. Registers an `emailService` in the DI container using the AWS SDK v3.

## Installation

```bash
npm install @meridianjs/email-ses
```

## Configuration

```typescript
// meridian.config.ts
export default defineConfig({
  modules: [
    {
      resolve: "@meridianjs/email-ses",
      options: {
        fromAddress:     process.env.EMAIL_FROM ?? "noreply@example.com",
        region:          process.env.AWS_SES_REGION ?? "us-east-1",
        accessKeyId:     process.env.AWS_SES_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY ?? "",
      },
    },
  ],
})
```

Add to your `.env`:

```bash
EMAIL_FROM=noreply@yourdomain.com
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=AKIA...
AWS_SES_SECRET_ACCESS_KEY=...
```

If running on an EC2 instance or ECS task with an IAM role attached, you can omit `accessKeyId` and `secretAccessKey` — the SDK will use the instance profile credentials automatically.

## Usage

```typescript
import type { IEmailService } from "@meridianjs/types"

const emailSvc = container.resolve("emailService") as IEmailService

await emailSvc.send({
  to:      "alice@example.com",
  subject: "Welcome to Acme Corp",
  html:    "<p>You've been invited to join <strong>Acme Corp</strong>.</p>",
  text:    "You've been invited to join Acme Corp.",
})
```

## Notes

- Only one email provider should be registered at a time.
- The `fromAddress` must be verified in AWS SES. In sandbox mode, `to` addresses must also be verified.

## License

MIT
