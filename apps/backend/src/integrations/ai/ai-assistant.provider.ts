import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoadEngineApplianceInput } from "../../common/calculation-engine/types";

export interface ParsedApplianceGuess {
  name: string;
  category: string;
  quantity: number;
  ratedWatts: number;
  hoursPerDay: number;
}

/**
 * AI Load Advisor (Architecture.docx §"AI-powered appliance recognition" /
 * §10 OpenAI integration). The AI only ever *interprets input and explains
 * results* — it never invents electrical calculations. The deterministic
 * Calculation Engine remains the source of truth; this provider's output
 * feeds appliance-creation forms for the user to confirm, exactly like the
 * doc's OCR confirmation flow.
 *
 * Without OPENAI_API_KEY configured, a small keyword-based mock parser is
 * used so the "describe your appliances in plain English" flow still works
 * end-to-end without a paid key.
 */
@Injectable()
export class AiAssistantProvider {
  private readonly logger = new Logger(AiAssistantProvider.name);
  private readonly isLive: boolean;

  private static readonly KNOWN_APPLIANCES: Array<{ keywords: string[]; category: string; watts: number }> = [
    { keywords: ["ac", "air conditioner", "air-con"], category: "cooling", watts: 1500 },
    { keywords: ["fridge", "refrigerator"], category: "kitchen", watts: 200 },
    { keywords: ["fan", "ceiling fan"], category: "cooling", watts: 75 },
    { keywords: ["tv", "television"], category: "electronics", watts: 120 },
    { keywords: ["microwave"], category: "kitchen", watts: 1200 },
    { keywords: ["water pump", "pump"], category: "water-pumping", watts: 750 },
    { keywords: ["washing machine", "washer"], category: "laundry", watts: 500 },
    { keywords: ["light", "bulb", "led"], category: "lighting", watts: 12 },
    { keywords: ["water heater", "geyser"], category: "kitchen", watts: 2000 },
    { keywords: ["computer", "pc", "laptop"], category: "electronics", watts: 150 },
  ];

  constructor(private readonly config: ConfigService) {
    this.isLive = Boolean(this.config.get<string>("integrations.openaiApiKey"));
  }

  /**
   * "I have two ACs, a refrigerator, six fans, a water pump and a 1,500W
   * microwave" -> a structured list of appliance guesses for the user to
   * review before they're created as real ProjectAppliance rows.
   */
  async parseApplianceDescription(description: string): Promise<ParsedApplianceGuess[]> {
    if (this.isLive) {
      this.logger.warn("OPENAI_API_KEY is set but the live client is not wired up yet; using mock parser.");
    }

    const text = description.toLowerCase();
    const results: ParsedApplianceGuess[] = [];

    for (const known of AiAssistantProvider.KNOWN_APPLIANCES) {
      for (const keyword of known.keywords) {
        const pattern = new RegExp(`(\\d+)?\\s*(?:x\\s*)?${escapeRegExp(keyword)}s?`, "i");
        const match = text.match(pattern);
        if (match) {
          const quantity = match[1] ? parseInt(match[1], 10) : guessQuantityWord(text, keyword) ?? 1;
          const wattsMatch = text.match(new RegExp(`(\\d{2,5})\\s*w(?:att)?s?[^a-z]{0,15}${escapeRegExp(keyword)}`, "i"));
          results.push({
            name: titleCase(keyword),
            category: known.category,
            quantity,
            ratedWatts: wattsMatch ? Number(wattsMatch[1]) : known.watts,
            hoursPerDay: 4,
          });
          break;
        }
      }
    }

    return results;
  }

  /** Turns a computed calculation result into a short plain-English summary. */
  async explainResult(summary: {
    peakLoadW: number;
    monthlyKwh: number;
    recommendedInverterVA?: number;
  }): Promise<string> {
    const parts = [
      `Your estimated peak load is ${(summary.peakLoadW / 1000).toFixed(1)} kW`,
      `estimated consumption is ${summary.monthlyKwh.toFixed(1)} kWh/month`,
    ];
    if (summary.recommendedInverterVA) {
      parts.push(`a ${(summary.recommendedInverterVA / 1000).toFixed(1)} kVA inverter is recommended`);
    }
    return `${parts.join(", ")}.`;
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function guessQuantityWord(text: string, keyword: string): number | null {
  const words: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
  for (const [word, value] of Object.entries(words)) {
    if (text.includes(`${word} ${keyword}`)) return value;
  }
  return null;
}

export type { LoadEngineApplianceInput };
