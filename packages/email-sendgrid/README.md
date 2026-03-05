# @meridianjs/email-sendgrid

[SendGrid](https://sendgrid.com) email provider for MeridianJS. Registers an `emailService` in the DI container that implements the `IEmailService` interface.

## Installation

```bash
npm install @meridianjs/email-sendgrid
```

## Configuration

```typescript
// meridian.config.ts
export default defineConfig({
  modules: [
    {
      resolve: "@meridianjs/email-sendgrid",
      options: {
        apiKey:      process.env.SENDGRID_API_KEY ?? "",
        fromAddress: process.env.EMAIL_FROM ?? "noreply@example.com",
      },
    },
  ],
})
```

Add to your `.env`:

```bash
SENDGRID_API_KEY=SG.your_api_key
EMAIL_FROM=noreply@yourdomain.com
```

## Usage

```typescript
import type { IEmailService } from "@meridianjs/types"

const emailSvc = container.resolve("emailService") as IEmailService

await emailSvc.send({
  to:      "alice@example.com",
  subject: "Sprint completed",
  html:    "<p>Sprint 3 has been completed.</p>",
  text:    "Sprint 3 has been completed.",
})
```

## Notes

- Only one email provider should be registered at a time — all three (`email-resend`, `email-sendgrid`, `email-ses`) register under the same `emailService` token.
- Both `html` and `text` are optional — pass at least one.

## License

MIT
