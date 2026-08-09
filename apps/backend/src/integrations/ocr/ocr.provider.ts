import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface NameplateExtraction {
  voltage: number | null;
  current: number | null;
  watts: number | null;
  frequency: number | null;
  confidence: number; // 0-1
}

/**
 * Appliance nameplate OCR (Architecture.docx §"AI/OCR Backend" — Google
 * Cloud Vision / AWS Textract candidates). Extracted values are never
 * trusted automatically: the caller must always route them through a user
 * confirmation step before creating a ProjectAppliance, per the doc.
 *
 * No OCR credentials are configured by default, so this returns a
 * low-confidence empty result — the endpoint still works end-to-end for
 * exercising the confirm-before-use flow.
 */
@Injectable()
export class OcrProvider {
  private readonly logger = new Logger(OcrProvider.name);
  private readonly isLive: boolean;

  constructor(private readonly config: ConfigService) {
    this.isLive = Boolean(this.config.get<string>("integrations.googleVisionApiKey"));
  }

  async extractNameplate(_imageBuffer: Buffer): Promise<NameplateExtraction> {
    if (this.isLive) {
      this.logger.warn("GOOGLE_CLOUD_VISION_API_KEY is set but the live client is not wired up yet; using mock OCR.");
    }
    return { voltage: null, current: null, watts: null, frequency: null, confidence: 0 };
  }
}
