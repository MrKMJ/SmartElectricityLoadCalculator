import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SunHoursEstimate {
  peakSunHours: number;
  source: "open-meteo" | "fallback";
}

/**
 * Open-Meteo integration (Architecture.docx: 3rd-party API stack, "Build
 * immediately" tier). Free, keyless — used alongside NREL PVWatts for
 * near-term irradiance data. PVWatts = long-run system modeling;
 * Open-Meteo = current/forecast conditions, per the doc's guidance.
 */
@Injectable()
export class OpenMeteoProvider {
  private readonly logger = new Logger(OpenMeteoProvider.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>("integrations.openMeteoBaseUrl")!;
  }

  /**
   * Approximates average daily peak-sun-hours from recent shortwave solar
   * radiation. Falls back to a conservative default if the API is
   * unreachable — this must never block a solar sizing calculation.
   */
  async getPeakSunHours(latitude?: number, longitude?: number): Promise<SunHoursEstimate> {
    if (latitude == null || longitude == null) {
      return { peakSunHours: 4.5, source: "fallback" };
    }

    try {
      const url = new URL(`${this.baseUrl}/forecast`);
      url.searchParams.set("latitude", String(latitude));
      url.searchParams.set("longitude", String(longitude));
      url.searchParams.set("daily", "shortwave_radiation_sum");
      url.searchParams.set("forecast_days", "7");
      url.searchParams.set("timezone", "auto");

      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
      const data = (await response.json()) as {
        daily?: { shortwave_radiation_sum?: number[] };
      };
      const values = data.daily?.shortwave_radiation_sum ?? [];
      if (values.length === 0) throw new Error("No radiation data returned");

      // shortwave_radiation_sum is in MJ/m^2/day; 1 kWh/m^2 = 3.6 MJ/m^2,
      // and 1 "peak sun hour" is defined as 1 kWh/m^2 of irradiance.
      const avgMJ = values.reduce((sum, v) => sum + v, 0) / values.length;
      const peakSunHours = Math.max(1, Math.round((avgMJ / 3.6) * 10) / 10);

      return { peakSunHours, source: "open-meteo" };
    } catch (error) {
      this.logger.warn(`Open-Meteo lookup failed, using fallback: ${(error as Error).message}`);
      return { peakSunHours: 4.5, source: "fallback" };
    }
  }
}
