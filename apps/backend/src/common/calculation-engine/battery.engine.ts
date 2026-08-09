import { round } from "./load.engine";

export type BatteryType = "LEAD_ACID" | "AGM" | "GEL" | "LITHIUM";

// Typical usable depth-of-discharge by chemistry, used as a sane default
// when the caller doesn't specify one.
const DEFAULT_DOD: Record<BatteryType, number> = {
  LEAD_ACID: 0.5,
  AGM: 0.6,
  GEL: 0.6,
  LITHIUM: 0.9,
};

export interface BatterySizingInput {
  loadW: number;
  backupHours: number;
  batteryVoltage?: number; // default 12V
  batteryType?: BatteryType;
  depthOfDischarge?: number; // 0-1, overrides chemistry default
  inverterEfficiency?: number; // 0-1, default 0.9
  safetyMarginPct?: number; // default 20
  singleBatteryAh?: number; // default 100Ah, used to compute battery count
}

export interface BatterySizingResult {
  loadW: number;
  backupHours: number;
  batteryVoltage: number;
  batteryType: BatteryType;
  depthOfDischarge: number;
  inverterEfficiency: number;
  safetyMarginPct: number;
  requiredWh: number;
  requiredAh: number;
  singleBatteryAh: number;
  numberOfBatteries: number;
  configuration: string;
  estimatedRuntimeHours: number;
}

/**
 * Battery Sizing Engine (Architecture.docx §17).
 *
 *   Required battery energy = (Load × backup hours) / (inverter efficiency × usable DoD)
 *   Battery Ah              = Required Wh / battery voltage
 */
export function calculateBatterySizing(input: BatterySizingInput): BatterySizingResult {
  const batteryVoltage = input.batteryVoltage ?? 12;
  const batteryType = input.batteryType ?? "LEAD_ACID";
  const depthOfDischarge = clamp01(input.depthOfDischarge ?? DEFAULT_DOD[batteryType]);
  const inverterEfficiency = clamp01(input.inverterEfficiency ?? 0.9);
  const safetyMarginPct = Math.max(0, input.safetyMarginPct ?? 20);
  const singleBatteryAh = input.singleBatteryAh ?? 100;

  const baseWh = (input.loadW * input.backupHours) / (inverterEfficiency * depthOfDischarge);
  const requiredWh = round(baseWh * (1 + safetyMarginPct / 100));
  const requiredAh = round(requiredWh / batteryVoltage, 1);

  const numberOfBatteries = Math.max(1, Math.ceil(requiredAh / singleBatteryAh));
  const configuration = describeConfiguration(numberOfBatteries, batteryVoltage);

  const installedAh = numberOfBatteries * singleBatteryAh;
  const estimatedRuntimeHours = round(
    (installedAh * batteryVoltage * inverterEfficiency * depthOfDischarge) / Math.max(1, input.loadW),
    1,
  );

  return {
    loadW: input.loadW,
    backupHours: input.backupHours,
    batteryVoltage,
    batteryType,
    depthOfDischarge,
    inverterEfficiency,
    safetyMarginPct,
    requiredWh,
    requiredAh,
    singleBatteryAh,
    numberOfBatteries,
    configuration,
    estimatedRuntimeHours,
  };
}

function describeConfiguration(count: number, voltage: number): string {
  // Assumes 12V unit batteries; series count needed to reach the target bus voltage.
  const seriesCount = Math.max(1, Math.round(voltage / 12));
  const parallelCount = Math.max(1, Math.ceil(count / seriesCount));
  return `${seriesCount}S${parallelCount}P`;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0.05, value));
}
