import { LoadEngineApplianceInput, LoadItemResult, LoadSummary } from "./types";

/**
 * Core load formulas (Architecture.docx §10 "Calculation Engine"):
 *
 *   Connected Load = Σ(rated watts × quantity)
 *   Daily kWh      = Σ(watts × quantity × hours) / 1000
 *   Monthly kWh    = Daily kWh × billing days
 *   Current        = Watts / (Voltage × Power Factor)
 *   VA             = Watts / Power Factor
 *
 * This module never touches the database or the network — it is pure so it
 * can run identically on the server (authoritative) and, if ever needed,
 * client-side for instant UX, per the doc's guidance that the backend must
 * remain the single source of truth.
 */

export function calculateLoadItem(input: LoadEngineApplianceInput): LoadItemResult {
  const quantity = Math.max(0, input.quantity);
  const runningWatts = input.ratedWatts * quantity;
  const surgeWatts = (input.surgeWatts ?? input.ratedWatts) * quantity;
  const hoursPerDay = Math.min(24, Math.max(0, input.hoursPerDay));
  const daysPerMonth = Math.min(31, Math.max(0, input.daysPerMonth ?? 30));

  const dailyKwh = (runningWatts * hoursPerDay) / 1000;
  const monthlyKwh = dailyKwh * daysPerMonth;

  return {
    applianceId: input.id,
    name: input.name,
    quantity,
    runningWatts,
    surgeWatts,
    hoursPerDay,
    dailyKwh: round(dailyKwh),
    monthlyKwh: round(monthlyKwh),
  };
}

export function calculateLoadSummary(appliances: LoadEngineApplianceInput[]): LoadSummary {
  const items = appliances.map(calculateLoadItem);

  const connectedWatts = items.reduce((sum, i) => sum + i.runningWatts, 0);
  const runningWatts = connectedWatts; // all connected appliances counted as running for the aggregate
  const surgeWatts = items.reduce((sum, i) => sum + i.surgeWatts, 0);
  const dailyKwh = items.reduce((sum, i) => sum + i.dailyKwh, 0);
  const monthlyKwh = items.reduce((sum, i) => sum + i.monthlyKwh, 0);
  const annualKwh = monthlyKwh * 12;

  return {
    connectedWatts: round(connectedWatts),
    runningWatts: round(runningWatts),
    surgeWatts: round(surgeWatts),
    dailyKwh: round(dailyKwh),
    monthlyKwh: round(monthlyKwh),
    annualKwh: round(annualKwh),
    items,
  };
}

export function wattsToCurrent(watts: number, voltage: number, powerFactor: number): number {
  if (voltage <= 0 || powerFactor <= 0) return 0;
  return round(watts / (voltage * powerFactor), 2);
}

export function wattsToVA(watts: number, powerFactor: number): number {
  if (powerFactor <= 0) return 0;
  return round(watts / powerFactor);
}

export function applySafetyMargin(value: number, marginPct: number): number {
  return round(value * (1 + marginPct / 100));
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
