import sgMail from "@sendgrid/mail"
import type { IEmailService, EmailSendOptions, ModuleDefinition } from "@meridianjs/types"

export interface SendgridEmailOptions {
  apiKey: string
  fromAddress: string
}

export class SendgridEmailService implements IEmailService {
  private readonly fromAddress: string

  constructor(container: any) {
    const options = container.resolve("moduleOptions") as SendgridEmailOptions
    this.fromAddress = options.fromAddress
    sgMail.setApiKey(options.apiKey)
  }

  async send({ to, subject, html, text }: EmailSendOptions): Promise<void> {
    const msg: Record<string, unknown> = { to, from: this.fromAddress, subject }
    if (html) msg.html = html
    if (text) msg.text = text
    await sgMail.send(msg as any)
  }
}

const EmailSendgridModule: ModuleDefinition = {
  key: "emailService",
  service: SendgridEmailService as any,
}

export default EmailSendgridModule
