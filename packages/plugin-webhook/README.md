# @meridianjs/plugin-webhook

Webhook receiver plugin for MeridianJS. Exposes `POST /webhooks/:provider` — one URL per external service — stores each event as a `WebhookEvent` record, and emits `webhook.received` on the event bus.

**The framework does not verify signatures.** Every platform uses a different signing scheme. The raw headers and body are forwarded to subscribers so each one can run the correct verification for its provider.

## Installation

```bash
npm install @meridianjs/plugin-webhook
```

## Configuration

```typescript
// meridian.config.ts
export default defineConfig({
  plugins: [
    { resolve: "@meridianjs/meridian" },
    { resolve: "@meridianjs/plugin-webhook" },
  ],
})
```

## Endpoint

```
POST /webhooks/:provider
```

| Service | URL |
|---------|-----|
| GitHub  | `https://your-app.com/webhooks/github`  |
| Stripe  | `https://your-app.com/webhooks/stripe`  |
| Slack   | `https://your-app.com/webhooks/slack`   |
| Shopify | `https://your-app.com/webhooks/shopify` |

## Event payload

The complete, unmodified request is forwarded to subscribers:

```typescript
interface WebhookReceivedData {
  id: string
  provider: string
  event_type: string
  payload: Record<string, unknown>  // parsed JSON body
  rawBody: string | null            // unparsed body string (required for HMAC verification)
  headers: Record<string, string>   // all request headers, exactly as received
}
```

## Handling events with signature verification

Create one subscriber per provider. Filter on `provider`, verify the signature using your platform's scheme, then act on the payload.

```typescript
// src/subscribers/on-github-webhook.ts — HMAC-SHA256 of raw body
import { createHmac, timingSafeEqual } from "node:crypto"
import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

function verify(secret: string, rawBody: string, sig: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex")
  try { return timingSafeEqual(Buffer.from(expected), Buffer.from(sig)) } catch { return false }
}

export default async function handler({ event, container }: SubscriberArgs<any>) {
  const { provider, event_type, payload, rawBody, headers } = event.data
  if (provider !== "github") return

  if (!verify(process.env.GITHUB_WEBHOOK_SECRET!, rawBody, headers["x-hub-signature-256"] ?? "")) {
    ;(container.resolve("logger") as any).warn("[webhook] GitHub: invalid signature")
    return
  }

  if (event_type === "push") {
    // parse commit messages for issue identifiers and create comments ...
  }
}

export const config: SubscriberConfig = { event: "webhook.received" }
```

```typescript
// src/subscribers/on-stripe-webhook.ts — timestamp + HMAC, replay-attack protection
import { createHmac, timingSafeEqual } from "node:crypto"
import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

function verify(secret: string, rawBody: string, sigHeader: string): boolean {
  const parts = Object.fromEntries(sigHeader.split(",").map(p => p.split("=")))
  if (!parts["t"] || !parts["v1"]) return false
  if (Math.abs(Date.now() / 1000 - Number(parts["t"])) > 300) return false  // 5-min window
  const expected = createHmac("sha256", secret).update(`${parts["t"]}.${rawBody}`).digest("hex")
  try { return timingSafeEqual(Buffer.from(expected), Buffer.from(parts["v1"])) } catch { return false }
}

export default async function handler({ event, container }: SubscriberArgs<any>) {
  const { provider, event_type, payload, rawBody, headers } = event.data
  if (provider !== "stripe") return

  if (!verify(process.env.STRIPE_WEBHOOK_SECRET!, rawBody, headers["stripe-signature"] ?? "")) {
    ;(container.resolve("logger") as any).warn("[webhook] Stripe: invalid signature")
    return
  }

  if (event_type === "checkout.session.completed") {
    // provision subscription ...
  }
}

export const config: SubscriberConfig = { event: "webhook.received" }
```

## Service: `webhookModuleService`

```typescript
const svc = container.resolve("webhookModuleService") as any

const [events] = await svc.listAndCountWebhookEvents({ provider: "github" })
const event    = await svc.retrieveWebhookEvent(id)
```

## License

MIT
