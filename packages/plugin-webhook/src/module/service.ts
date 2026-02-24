import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import { WebhookEvent } from "./models/webhook-event.js"

export class WebhookModuleService extends MeridianService({ WebhookEvent }) {
  constructor(container: MeridianContainer) {
    super(container)
  }

  /** Mark a webhook event as processed */
  async markProcessed(id: string): Promise<void> {
    await this.updateWebhookEvent(id, { status: "processed" } as any)
  }

  /** Mark a webhook event as failed */
  async markFailed(id: string): Promise<void> {
    await this.updateWebhookEvent(id, { status: "failed" } as any)
  }
}
