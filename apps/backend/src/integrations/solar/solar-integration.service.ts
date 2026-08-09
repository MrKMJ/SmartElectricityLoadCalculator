import { Injectable } from "@nestjs/common";
import { OpenMeteoProvider } from "../weather/open-meteo.provider";
import { NrelPvWattsProvider } from "./nrel-pvwatts.provider";
import { CalculationEngineService } from "../../common/calculation-engine/calculation-engine.service";
import { SolarSizingInput, SolarSizingResult } from "../../common/calculation-engine/solar.engine";

export interface EnrichedSolarSizingResult extends SolarSizingResult {
  dataSource: "formula" | "nrel_pvwatts";
  rawProviderResponse: unknown | null;
}

/**
 * Orchestrates the solar sizing pipeline described in Architecture.docx
 * §"Maps + Solar + Weather Combined": location -> peak sun hours -> formula
 * estimate -> (optionally) refine with real NREL PVWatts production data.
 *
 * The Calculation Engine's own solar formula is always the fallback, never
 * the third-party API — "third-party APIs should enrich your platform, not
 * become the source of truth for your core electrical calculations."
 */
@Injectable()
export class SolarIntegrationService {
  constructor(
    private readonly openMeteo: OpenMeteoProvider,
    private readonly pvWatts: NrelPvWattsProvider,
    private readonly engine: CalculationEngineService,
  ) {}

  async size(
    input: Omit<SolarSizingInput, "peakSunHours"> & { peakSunHours?: number; latitude?: number; longitude?: number },
  ): Promise<EnrichedSolarSizingResult> {
    let peakSunHours = input.peakSunHours;
    if (peakSunHours == null) {
      const estimate = await this.openMeteo.getPeakSunHours(input.latitude, input.longitude);
      peakSunHours = estimate.peakSunHours;
    }

    const formulaResult = this.engine.solar.calculateSolarSizing({ ...input, peakSunHours });

    if (input.latitude == null || input.longitude == null) {
      return { ...formulaResult, dataSource: "formula", rawProviderResponse: null };
    }

    const pvWattsResult = await this.pvWatts.getProductionEstimate({
      latitude: input.latitude,
      longitude: input.longitude,
      systemCapacityKw: formulaResult.requiredKw,
    });

    if (!pvWattsResult) {
      return { ...formulaResult, dataSource: "formula", rawProviderResponse: null };
    }

    const estimatedDailyGenKwh = round(pvWattsResult.acAnnualKwh / 365, 2);
    const estimatedMonthlyGenKwh = round(pvWattsResult.acAnnualKwh / 12, 1);
    const actualCoveragePct = input.dailyKwh > 0 ? round((estimatedDailyGenKwh / input.dailyKwh) * 100, 1) : 0;

    return {
      ...formulaResult,
      estimatedDailyGenKwh,
      estimatedMonthlyGenKwh,
      actualCoveragePct,
      dataSource: "nrel_pvwatts",
      rawProviderResponse: pvWattsResult,
    };
  }
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
