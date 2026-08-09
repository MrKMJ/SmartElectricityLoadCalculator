import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { ENGINE_VERSION, FORMULA_VERSION } from "./constants";
import * as LoadEngine from "./load.engine";
import * as PeakLoadEngine from "./peak-load.engine";
import * as InverterEngine from "./inverter.engine";
import * as BatteryEngine from "./battery.engine";
import * as SolarEngine from "./solar.engine";
import * as GeneratorEngine from "./generator.engine";
import * as BillEngine from "./bill.engine";
import * as EssentialLoadEngine from "./essential-load.engine";
import * as RecommendationEngine from "./recommendation.engine";
import * as ScheduleEngine from "./schedule.engine";
import * as EnergyAnalysisEngine from "./energy-analysis.engine";

/**
 * Single injectable facade over every formula module in the Calculation
 * Engine. Architecture.docx is explicit about this being "the key
 * architectural decision": keep all electrical formulas inside a dedicated
 * engine rather than scattering them across controllers, so the API, web
 * app, reports, and any future mobile/IoT client share one authoritative
 * implementation.
 */
@Injectable()
export class CalculationEngineService {
  readonly engineVersion = ENGINE_VERSION;
  readonly formulaVersion = FORMULA_VERSION;

  readonly load = LoadEngine;
  readonly peakLoad = PeakLoadEngine;
  readonly inverter = InverterEngine;
  readonly battery = BatteryEngine;
  readonly solar = SolarEngine;
  readonly generator = GeneratorEngine;
  readonly bill = BillEngine;
  readonly essentialLoad = EssentialLoadEngine;
  readonly recommendation = RecommendationEngine;
  readonly schedule = ScheduleEngine;
  readonly energyAnalysis = EnergyAnalysisEngine;

  hashInputs(inputs: unknown): string {
    return createHash("sha256").update(JSON.stringify(inputs)).digest("hex").slice(0, 16);
  }
}
