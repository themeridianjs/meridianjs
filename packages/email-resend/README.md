# @meridianjs/email-resend

[Resend](https://resend.com) email provider for MeridianJS. Registers an `emailService` in the DI container that implements the `IEmailService` interface.

## Installation

```bash
npm install @meridianjs/email-resend
```

## Configuration

```typescript
// meridian.config.ts
export default defineConfig({
  modules: [
    {
      resolve: "@meridianjs/email-resend",
      options: {
        apiKey:      process.env.RESEND_API_KEY ?? "",
        fromAddress: process.env.EMAIL_FROM ?? "noreply@example.com",
      },
    },
  ],
})
```

Add to your `.env`:

```bash
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com
```

## Usage

Resolve `emailService` from the container in a subscriber, route, or job:

```typescript
import type { IEmailService } from "@meridianjs/types"

const emailSvc = container.resolve("emailService") as IEmailService

await emailSvc.send({
  to:      "alice@example.com",
  subject: "You have been added to a workspace",
  html:    "<p>Welcome to <strong>Acme Corp</strong>!</p>",
  text:    "Welcome to Acme Corp!",
})
```

## Notes

- Both `html` and `text` are optional — pass at least one.
- Errors from the Resend API are rethrown as `Error` instances.

## License

MIT
