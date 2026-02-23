import { model } from "@meridian/framework-utils"

export const WebhookEvent = model.define("webhook_event", {
  id: model.id(),
  /** The service that sent this webhook (e.g. "github", "stripe", "custom") */
  provider: model.text(),
  /** Event type string as reported by the provider (e.g. "push", "payment.succeeded") */
  event_type: model.text(),
  /** Raw request payload (parsed JSON or raw body stored as text) */
  payload: model.json(),
  /** HMAC signature header, if provided */
  signature: model.text().nullable(),
  /** Processing status */
  status: model.enum(["received", "processed", "failed"]).default("received"),
})
