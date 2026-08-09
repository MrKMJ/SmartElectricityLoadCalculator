import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** Transactional email via Postmark (Architecture.docx §7), mocked (logged) without a token. */
@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly isLive: boolean;

  constructor(private readonly config: ConfigService) {
    this.isLive = Boolean(this.config.get<string>("integrations.postmarkToken"));
  }

  async send(to: string, subject: string, body: string): Promise<{ sent: boolean }> {
    if (!this.isLive) {
      this.logger.log(`[MOCK EMAIL] to=${to} subject="${subject}"`);
      return { sent: true };
    }
    throw new Error("Live Postmark integration is not implemented yet.");
  }
}
