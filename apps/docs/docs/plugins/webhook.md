---
id: webhook
title: Webhook Plugin
description: Installing and configuring @meridianjs/plugin-webhook.
sidebar_position: 2
---

# Webhook Plugin (`@meridianjs/plugin-webhook`)

The webhook plugin adds a generic webhook receiver endpoint to your MeridianJS app. It verifies HMAC-SHA256 signatures and emits a `webhook.received` event on the event bus for downstream subscribers to handle.

---

## Installation

The plugin ships as part of the `@meridianjs/` monorepo. Add it to your `meridian.config.ts`:

```typescript
import { defineConfig } from '@meridianjs/framework'

export default defineConfig({
  projectConfig: { /* ... */ },
  modules: [
    { resolve: '@meridianjs/event-bus-local' },
    { resolve: '@meridianjs/job-queue-local' },
  ],
  plugins: [
    { resolve: '@meridianjs/meridian' },
    {
      resolve: '@meridianjs/plugin-webhook',
      options: {
        webhookSecret: process.env.WEBHOOK_SECRET,
      },
    },
  ],
})
```

---

## Endpoint

Once registered, the plugin exposes:

```
POST /webhooks/receive
```

### Request Format

```
POST /webhooks/receive
Content-Type: application/json
X-Webhook-Signature: sha256=<hmac>

{ "event": "order.completed", "data": { ... } }
```

The `X-Webhook-Signature` header must contain an HMAC-SHA256 of the raw body using your `webhookSecret`. Requests without a valid signature return `401 Unauthorized`.

---

## Handling Webhook Events

Subscribe to `webhook.received` in a subscriber file:

```typescript
// src/subscribers/on-webhook-received.ts
import type { SubscriberConfig, SubscriberArgs } from '@meridianjs/types'

export default {
  event: 'webhook.received',
  subscriberId: 'on-webhook-received',

  async handler({ data, container }: SubscriberArgs) {
    const { event, payload, source } = data

    if (event === 'order.completed') {
      // Handle order completion from external system
      const projectSvc = container.resolve('projectModuleService')
      // ...
    }
  },
} satisfies SubscriberConfig
```

---

## Event Payload

```typescript
interface WebhookReceivedPayload {
  event: string           // e.g. "order.completed"
  payload: unknown        // parsed JSON body
  source: string          // IP address of the caller
  received_at: string     // ISO timestamp
}
```

---

## Signature Verification

The plugin uses Node.js `crypto.timingSafeEqual` to prevent timing attacks:

```typescript
const expected = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex')

const signature = req.headers['x-webhook-signature']?.replace('sha256=', '') ?? ''

if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
  return res.status(401).json({ error: 'Invalid signature' })
}
```

---

## Testing Locally

You can use `ngrok` or `cloudflared` to expose your local server:

```bash
ngrok http 9000
# Webhook URL: https://abc123.ngrok.io/webhooks/receive
```

Generate a test signature:
```bash
echo -n '{"event":"test","data":{}}' | openssl dgst -sha256 -hmac "your-secret"
```
