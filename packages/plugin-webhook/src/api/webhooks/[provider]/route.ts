import type { Response } from "express"

/**
 * POST /webhooks/:provider
 *
 * Public endpoint that receives webhook events from external services.
 * Stores the event and emits `webhook.received` for downstream processing.
 *
 * Query params:
 *   ?event_type=push   — override the event type (default: from X-Event-Type header)
 */
export const POST = async (req: any, res: Response) => {
  const { provider } = req.params as { provider: string }

  const eventType =
    (req.query.event_type as string | undefined) ??
    req.headers["x-event-type"] ??
    req.headers["x-github-event"] ??
    req.headers["x-stripe-event"] ??
    "unknown"

  const signature = (
    req.headers["x-hub-signature-256"] ??
    req.headers["x-webhook-signature"] ??
    null
  ) as string | null

  const webhookService = req.scope.resolve("webhookModuleService") as any
  const eventBus = req.scope.resolve("eventBus") as any

  const webhookEvent = await webhookService.createWebhookEvent({
    provider,
    event_type: String(eventType),
    payload: req.body ?? {},
    signature,
    status: "received",
  })

  // Emit event for subscribers to handle asynchronously
  await eventBus.emit({
    name: "webhook.received",
    data: {
      id: webhookEvent.id,
      provider,
      event_type: String(eventType),
      payload: req.body ?? {},
    },
  })

  res.status(200).json({ received: true, id: webhookEvent.id })
}
