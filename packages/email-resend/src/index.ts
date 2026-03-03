import { Resend } from "resend"
import type { IEmailService, EmailSendOptions, ModuleDefinition } from "@meridianjs/types"

export interface ResendEmailOptions {
  apiKey: string
  fromAddress: string
}

export class ResendEmailService implements IEmailService {
  private readonly client: Resend
  private readonly fromAddress: string

  constructor(container: any) {
    const options = container.resolve("moduleOptions") as ResendEmailOptions
    this.fromAddress = options.fromAddress
    this.client = new Resend(options.apiKey)
  }

  async send({ to, subject, html, text }: EmailSendOptions): Promise<void> {
    const payload: Record<string, unknown> = { from: this.fromAddress, to, subject }
    if (html) payload.html = html
    if (text) payload.text = text
    const { error } = await this.client.emails.send(payload as any)
    if (error) throw new Error(error.message)
  }
}

const EmailResendModule: ModuleDefinition = {
  key: "emailService",
  service: ResendEmailService as any,
}

export default EmailResendModule
