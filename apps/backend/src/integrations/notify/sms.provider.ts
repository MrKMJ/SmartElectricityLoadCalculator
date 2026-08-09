import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** SMS/OTP via Twilio (Architecture.docx §8) — optional channel, mocked (logged) without credentials. */
@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly isLive: boolean;

  constructor(private readonly config: ConfigService) {
    this.isLive = Boolean(this.config.get<string>("integrations.twilioSid"));
  }

  async send(to: string, message: string): Promise<{ sent: boolean }> {
    if (!this.isLive) {
      this.logger.log(`[MOCK SMS] to=${to} message="${message}"`);
      return { sent: true };
    }
    throw new Error("Live Twilio integration is not implemented yet.");
  }
}
