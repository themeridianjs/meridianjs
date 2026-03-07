import type { Response } from "express"

/**
 * POST /webhooks/:provider
 *
 * Accepts inbound webhook events from any external service and forwards them
 * to subscribers as-is. No signature verification is performed — that is the
 * subscriber's responsibility since every platform uses a different scheme.
 *
 * Query params:
 *   ?event_type=push   — override the event type stored on the record
 */
export const POST = async (req: any, res: Response) => {
  const { provider } = req.params as { provider: string }

  const eventType =
    (req.query.event_type as string | undefined) ??
    req.headers["x-event-type"] ??
    req.headers["x-github-event"] ??
    "unknown"

  const webhookService = req.scope.resolve("webhookModuleService") as any
  const eventBus = req.scope.resolve("eventBus") as any

  const webhookEvent = await webhookService.createWebhookEvent({
    provider,
    event_type: String(eventType),
    payload: req.body ?? {},
    status: "received",
  })

  await eventBus.emit({
    name: "webhook.received",
    data: {
      id: webhookEvent.id,
      provider,
      event_type: String(eventType),
      payload: req.body ?? {},
      rawBody: (req as any).rawBody ?? null,
      headers: req.headers,
    },
  })

  res.status(200).json({ received: true, id: webhookEvent.id })
}
