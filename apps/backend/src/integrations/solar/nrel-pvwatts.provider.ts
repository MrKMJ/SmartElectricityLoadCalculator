import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface PvWattsEstimate {
  acAnnualKwh: number;
  acMonthlyKwh: number[]; // 12 values, Jan..Dec
  capacityFactorPct: number;
  source: "nrel_pvwatts";
}

/**
 * NREL PVWatts v8 integration (Architecture.docx: "the most valuable
 * external API for your solar module"). Uses the public DEMO_KEY by
 * default so the app works with zero setup; swap NREL_API_KEY for a real
 * key from https://developer.nrel.gov to lift the demo rate limits.
 *
 * Per the doc: "don't expose the NREL API directly to the frontend" — this
 * provider is only ever called from SolarIntegrationService on the backend.
 */
@Injectable()
export class NrelPvWattsProvider {
  private readonly logger = new Logger(NrelPvWattsProvider.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>("integrations.nrelApiKey")!;
  }

  async getProductionEstimate(params: {
    latitude: number;
    longitude: number;
    systemCapacityKw: number;
    lossesPct?: number;
    tilt?: number;
    azimuth?: number;
  }): Promise<PvWattsEstimate | null> {
    try {
      const url = new URL("https://developer.nrel.gov/api/pvwatts/v8.json");
      url.searchParams.set("api_key", this.apiKey);
      url.searchParams.set("lat", String(params.latitude));
      url.searchParams.set("lon", String(params.longitude));
      url.searchParams.set("system_capacity", String(params.systemCapacityKw));
      url.searchParams.set("module_type", "0");
      url.searchParams.set("array_type", "1");
      url.searchParams.set("tilt", String(params.tilt ?? 20));
      url.searchParams.set("azimuth", String(params.azimuth ?? 180));
      url.searchParams.set("losses", String(params.lossesPct ?? 14));

      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error(`NREL PVWatts responded ${response.status}`);
      const data = (await response.json()) as {
        outputs?: { ac_annual?: number; ac_monthly?: number[]; capacity_factor?: number };
        errors?: string[];
      };
      if (data.errors?.length) throw new Error(data.errors.join("; "));
      if (!data.outputs?.ac_annual) throw new Error("No production data returned");

      return {
        acAnnualKwh: data.outputs.ac_annual,
        acMonthlyKwh: data.outputs.ac_monthly ?? [],
        capacityFactorPct: data.outputs.capacity_factor ?? 0,
        source: "nrel_pvwatts",
      };
    } catch (error) {
      this.logger.warn(`NREL PVWatts lookup failed, caller should fall back to formula: ${(error as Error).message}`);
      return null;
    }
  }
}
