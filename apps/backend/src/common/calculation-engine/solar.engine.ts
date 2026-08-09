import { round } from "./load.engine";

export interface SolarSizingInput {
  dailyKwh: number;
  peakSunHours: number; // from weather/NREL integration, or a manual estimate
  systemEfficiencyPct?: number; // default 80% (inverter + wiring + soiling losses)
  panelWattage?: number; // default 550W
  desiredCoveragePct?: number; // default 100
  electricityRatePerKwh?: number; // for savings estimate
  systemCostPerKw?: number; // for payback estimate
}

export interface SolarSizingResult {
  dailyKwh: number;
  peakSunHours: number;
  systemEfficiencyPct: number;
  panelWattage: number;
  desiredCoveragePct: number;
  requiredKw: number;
  panelQuantity: number;
  estimatedDailyGenKwh: number;
  estimatedMonthlyGenKwh: number;
  actualCoveragePct: number;
  estimatedMonthlySavings: number | null;
  paybackYears: number | null;
}

/**
 * Solar Sizing Engine — formula fallback (Architecture.docx §18).
 * Used when no NREL PVWatts data is available; the solar integration
 * provider will prefer real production data when it can reach the API,
 * falling back to this formula otherwise (see integrations/solar).
 */
export function calculateSolarSizing(input: SolarSizingInput): SolarSizingResult {
  const systemEfficiencyPct = input.systemEfficiencyPct ?? 80;
  const panelWattage = input.panelWattage ?? 550;
  const desiredCoveragePct = Math.min(100, Math.max(1, input.desiredCoveragePct ?? 100));
  const efficiency = systemEfficiencyPct / 100;
  const sunHours = Math.max(0.5, input.peakSunHours);

  const targetKwh = input.dailyKwh * (desiredCoveragePct / 100);
  const requiredKw = round(targetKwh / (sunHours * efficiency), 2);
  const panelQuantity = Math.max(1, Math.ceil((requiredKw * 1000) / panelWattage));

  const installedKw = round((panelQuantity * panelWattage) / 1000, 2);
  const estimatedDailyGenKwh = round(installedKw * sunHours * efficiency, 2);
  const estimatedMonthlyGenKwh = round(estimatedDailyGenKwh * 30, 1);
  const actualCoveragePct = input.dailyKwh > 0 ? round((estimatedDailyGenKwh / input.dailyKwh) * 100, 1) : 0;

  let estimatedMonthlySavings: number | null = null;
  let paybackYears: number | null = null;
  if (input.electricityRatePerKwh) {
    const coveredKwhMonthly = Math.min(input.dailyKwh * 30, estimatedMonthlyGenKwh);
    estimatedMonthlySavings = round(coveredKwhMonthly * input.electricityRatePerKwh);
    if (input.systemCostPerKw) {
      const systemCost = installedKw * input.systemCostPerKw;
      const annualSavings = estimatedMonthlySavings * 12;
      paybackYears = annualSavings > 0 ? round(systemCost / annualSavings, 1) : null;
    }
  }

  return {
    dailyKwh: input.dailyKwh,
    peakSunHours: sunHours,
    systemEfficiencyPct,
    panelWattage,
    desiredCoveragePct,
    requiredKw: installedKw,
    panelQuantity,
    estimatedDailyGenKwh,
    estimatedMonthlyGenKwh,
    actualCoveragePct,
    estimatedMonthlySavings,
    paybackYears,
  };
}
