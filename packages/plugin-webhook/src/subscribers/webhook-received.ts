import type { SubscriberArgs, SubscriberConfig } from "@meridian/types"

interface WebhookReceivedData {
  id: string
  provider: string
  event_type: string
  payload: unknown
}

/**
 * Logs every received webhook and marks it as processed.
 *
 * In a real application, replace or extend this subscriber to route events
 * to the appropriate handler based on provider + event_type.
 */
export default async function handleWebhookReceived({
  event,
  container,
}: SubscriberArgs<WebhookReceivedData>) {
  const logger = container.resolve("logger") as any
  const webhookService = container.resolve("webhookModuleService") as any

  const { id, provider, event_type } = event.data

  logger.info(`Webhook received: ${provider}/${event_type}`, { id })

  try {
    // Mark the event as processed
    await webhookService.markProcessed(id)
  } catch (err: any) {
    logger.error(`Failed to mark webhook ${id} as processed: ${err.message}`)
    await webhookService.markFailed(id).catch(() => null)
  }
}

export const config: SubscriberConfig = {
  event: "webhook.received",
}
