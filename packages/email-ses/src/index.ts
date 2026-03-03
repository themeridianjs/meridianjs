import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"
import type { IEmailService, EmailSendOptions, ModuleDefinition } from "@meridianjs/types"

interface SesEmailOptions {
  fromAddress: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
}

export class SesEmailService implements IEmailService {
  private readonly client: SESClient
  private readonly fromAddress: string

  constructor(container: any) {
    const options = container.resolve("moduleOptions") as SesEmailOptions
    this.fromAddress = options.fromAddress
    this.client = new SESClient({
      ...(options.region ? { region: options.region } : {}),
      ...(options.accessKeyId && options.secretAccessKey
        ? { credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey } }
        : {}),
    })
  }

  async send({ to, subject, text, html }: EmailSendOptions): Promise<void> {
    await this.client.send(new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Source: this.fromAddress,
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          ...(text ? { Text: { Data: text, Charset: "UTF-8" } } : {}),
          ...(html ? { Html: { Data: html, Charset: "UTF-8" } } : {}),
        },
      },
    }))
  }
}

const EmailSesModule: ModuleDefinition = {
  key: "emailService",
  service: SesEmailService as any,
}

export default EmailSesModule
