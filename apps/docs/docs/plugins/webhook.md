---
id: webhook
title: Webhook Plugin
description: Installing and configuring @meridianjs/plugin-webhook.
sidebar_position: 2
---

# Webhook Plugin (`@meridianjs/plugin-webhook`)

The webhook plugin adds a public `POST /webhooks/:provider` endpoint to your MeridianJS app. Each inbound request is stored as a `WebhookEvent` record and emitted on the event bus as `webhook.received`. Subscribers receive the raw payload, headers, and body so they can perform their own provider-specific verification.

**The framework does not verify signatures itself.** Every platform — GitHub, Stripe, Slack, Shopify — uses a different signing scheme, header name, and signing string. Centralising that logic in the framework would either get it wrong or force you to configure one secret per provider. Instead, each subscriber is responsible for verifying its own provider's signature before acting on the event.

---

## Installation

```bash
npm install @meridianjs/plugin-webhook
```

Add the plugin to `meridian.config.ts`:

```typescript
import { defineConfig } from '@meridianjs/framework'

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    httpPort: 9000,
  },
  modules: [
    { resolve: '@meridianjs/event-bus-local' },
    { resolve: '@meridianjs/job-queue-local' },
  ],
  plugins: [
    { resolve: '@meridianjs/meridian' },
    { resolve: '@meridianjs/plugin-webhook' },
  ],
})
```

---

## Endpoint

```
POST /webhooks/:provider
```

The `:provider` segment is a free-form string identifying the source — `github`, `stripe`, `slack`, or anything you choose. It is stored on the `WebhookEvent` record and forwarded to all `webhook.received` subscribers so they can filter by it.

Each external service gets its own URL to register in its dashboard:

| Service | Webhook URL |
|---|---|
| GitHub  | `https://your-app.com/webhooks/github` |
| Stripe  | `https://your-app.com/webhooks/stripe` |
| Slack   | `https://your-app.com/webhooks/slack`  |
| Shopify | `https://your-app.com/webhooks/shopify` |

The endpoint always returns `200` — even for requests with missing or invalid signatures. Returning any non-2xx status to external services typically triggers retries, so reject silently in your subscriber by returning early after verification fails.

---

## Event payload

Every `webhook.received` event includes the complete, unmodified request — headers, raw body, and parsed payload — so subscribers have everything they need to verify and act on the event:

```typescript
interface WebhookReceivedData {
  id: string                            // WebhookEvent record ID
  provider: string                      // e.g. "github"
  event_type: string                    // from X-GitHub-Event or X-Event-Type header
  payload: Record<string, unknown>      // parsed JSON body
  rawBody: string | null                // unparsed body string (required for HMAC verification)
  headers: Record<string, string>       // all request headers, exactly as received
}
```

---

## Handling multiple providers

Create one subscriber file per provider. All listen for `webhook.received` — Meridian fans the event out to all of them — and each one filters on `provider` and verifies the signature using its platform's specific method.

```
src/
  subscribers/
    on-github-webhook.ts
    on-stripe-webhook.ts
    on-slack-webhook.ts
```

### GitHub (`X-Hub-Signature-256`)

GitHub signs the raw request body with HMAC-SHA256 and sends it as `sha256=<hex>` in `X-Hub-Signature-256`.

```typescript
// src/subscribers/on-github-webhook.ts
import { createHmac, timingSafeEqual } from "node:crypto"
import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

function verifyGitHub(secret: string, rawBody: string, sig: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return false
  }
}

export default async function handler({ event, container }: SubscriberArgs<any>) {
  const { provider, event_type, payload, rawBody, headers } = event.data
  if (provider !== "github") return

  const sig = headers["x-hub-signature-256"]
  if (!sig || !verifyGitHub(process.env.GITHUB_WEBHOOK_SECRET!, rawBody, sig)) {
    const logger = container.resolve("logger") as any
    logger.warn("[webhook] GitHub signature verification failed — ignoring event")
    return
  }

  if (event_type === "push") {
    const issueService = container.resolve("issueModuleService") as any
    for (const commit of payload.commits ?? []) {
      const identifiers: string[] = (commit.message as string).match(/[A-Z]+-\d+/g) ?? []
      for (const identifier of identifiers) {
        const [issues] = await issueService.listAndCountIssues({ identifier }).catch(() => [[]])
        if (issues[0]?.id) {
          await issueService.createComment({
            issue_id: issues[0].id,
            body: `Commit by ${commit.author.name}: ${commit.message}\n\n${commit.url}`,
          })
        }
      }
    }
  }
}

export const config: SubscriberConfig = { event: "webhook.received" }
```

Store the secret in `.env`:

```bash
# .env
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
```

### Stripe (`Stripe-Signature`)

Stripe uses a timestamp + HMAC scheme to prevent replay attacks. The `Stripe-Signature` header contains both the timestamp (`t=`) and the HMAC (`v1=`). The signing string is `<timestamp>.<rawBody>`.

```typescript
// src/subscribers/on-stripe-webhook.ts
import { createHmac, timingSafeEqual } from "node:crypto"
import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

function verifyStripe(secret: string, rawBody: string, sigHeader: string): boolean {
  // sigHeader format: "t=1234567890,v1=abc...,v0=xyz..."
  const parts = Object.fromEntries(sigHeader.split(",").map(p => p.split("=")))
  const timestamp = parts["t"]
  const v1 = parts["v1"]
  if (!timestamp || !v1) return false

  // Reject events older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const signingString = `${timestamp}.${rawBody}`
  const expected = createHmac("sha256", secret).update(signingString).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  } catch {
    return false
  }
}

export default async function handler({ event, container }: SubscriberArgs<any>) {
  const { provider, event_type, payload, rawBody, headers } = event.data
  if (provider !== "stripe") return

  const sig = headers["stripe-signature"]
  if (!sig || !verifyStripe(process.env.STRIPE_WEBHOOK_SECRET!, rawBody, sig)) {
    const logger = container.resolve("logger") as any
    logger.warn("[webhook] Stripe signature verification failed — ignoring event")
    return
  }

  if (event_type === "checkout.session.completed") {
    const notifService = container.resolve("notificationModuleService") as any
    await notifService.createNotification({
      user_id: payload.metadata?.user_id,
      entity_type: "workspace",
      entity_id: payload.metadata?.workspace_id,
      action: "payment_completed",
      message: "Your subscription is now active.",
      workspace_id: payload.metadata?.workspace_id,
    })
  }
}

export const config: SubscriberConfig = { event: "webhook.received" }
```

```bash
# .env
STRIPE_WEBHOOK_SECRET=whsec_...   # from Stripe dashboard → Webhooks → signing secret
```

### Slack (`X-Slack-Signature`)

Slack includes a request timestamp in a separate header and requires it to be part of the signing string (`v0:<timestamp>:<rawBody>`). Always check the timestamp to prevent replay attacks.

```typescript
// src/subscribers/on-slack-webhook.ts
import { createHmac, timingSafeEqual } from "node:crypto"
import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

function verifySlack(secret: string, rawBody: string, timestamp: string, sig: string): boolean {
  // Reject events older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const signingString = `v0:${timestamp}:${rawBody}`
  const expected = "v0=" + createHmac("sha256", secret).update(signingString).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return false
  }
}

export default async function handler({ event, container }: SubscriberArgs<any>) {
  const { provider, payload, rawBody, headers } = event.data
  if (provider !== "slack") return

  const sig = headers["x-slack-signature"]
  const ts  = headers["x-slack-request-timestamp"]
  if (!sig || !ts || !verifySlack(process.env.SLACK_SIGNING_SECRET!, rawBody, ts, sig)) {
    const logger = container.resolve("logger") as any
    logger.warn("[webhook] Slack signature verification failed — ignoring event")
    return
  }

  if (payload.type === "url_verification") {
    // Slack sends this to confirm your endpoint — the route already returned 200,
    // nothing else to do here.
    return
  }

  if (payload.event?.type === "app_mention") {
    // Handle bot mention
    console.log("Bot mentioned by:", payload.event.user, "—", payload.event.text)
  }
}

export const config: SubscriberConfig = { event: "webhook.received" }
```

```bash
# .env
SLACK_SIGNING_SECRET=your-slack-signing-secret
```

---

## Accessing stored events

Every inbound request is persisted as a `WebhookEvent` record queryable via `webhookModuleService`:

```typescript
const svc = container.resolve("webhookModuleService") as any

// All events from a specific provider
const [events, total] = await svc.listAndCountWebhookEvents({ provider: "stripe" })

// A specific event by ID
const ev = await svc.retrieveWebhookEvent(id)
```

---

## Testing locally

Use [ngrok](https://ngrok.com) or [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose your local server so external dashboards can reach it:

```bash
ngrok http 9000
# Register these URLs in each service's webhook dashboard:
#   GitHub:  https://abc123.ngrok.io/webhooks/github
#   Stripe:  https://abc123.ngrok.io/webhooks/stripe
#   Slack:   https://abc123.ngrok.io/webhooks/slack
```

To send a test request manually (GitHub-style):

```bash
SECRET="my-dev-secret"
BODY='{"ref":"refs/heads/main","commits":[{"message":"fix MER-42","author":{"name":"Dev"}}]}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print "sha256="$2}')

curl -X POST http://localhost:9000/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIG" \
  -H "X-GitHub-Event: push" \
  -d "$BODY"
# → {"received":true,"id":"..."}
```
