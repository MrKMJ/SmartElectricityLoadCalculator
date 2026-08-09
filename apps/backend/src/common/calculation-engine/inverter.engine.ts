import { round } from "./load.engine";

export interface InverterSizingInput {
  peakRunningW: number;
  peakSurgeW: number;
  powerFactor?: number; // default 0.8 (typical mixed household PF)
  safetyMarginPct?: number; // default 20
  candidateInverterVA?: number; // optional, to flag undersizing
}

export interface InverterSizingResult {
  peakRunningW: number;
  peakSurgeW: number;
  powerFactor: number;
  safetyMarginPct: number;
  minInverterVA: number;
  recommendedInverterVA: number;
  recommendedKva: number;
  requiredSurgeVA: number;
  utilizationPct: number;
  isUndersized: boolean;
}

/**
 * Inverter/UPS Sizing Engine (Architecture.docx §16).
 * The inverter must cover both continuous running load and the transient
 * surge load, each converted from watts to VA via power factor.
 */
export function calculateInverterSizing(input: InverterSizingInput): InverterSizingResult {
  const powerFactor = clampPf(input.powerFactor ?? 0.8);
  const safetyMarginPct = Math.max(0, input.safetyMarginPct ?? 20);

  const runningVA = input.peakRunningW / powerFactor;
  const surgeVA = input.peakSurgeW / powerFactor;

  const minInverterVA = Math.max(runningVA, surgeVA);
  const recommendedInverterVA = round(minInverterVA * (1 + safetyMarginPct / 100));
  const recommendedKva = round(recommendedInverterVA / 1000, 2);

  const utilizationPct = recommendedInverterVA > 0 ? round((runningVA / recommendedInverterVA) * 100, 1) : 0;

  const isUndersized =
    input.candidateInverterVA != null ? input.candidateInverterVA < minInverterVA : false;

  return {
    peakRunningW: input.peakRunningW,
    peakSurgeW: input.peakSurgeW,
    powerFactor,
    safetyMarginPct,
    minInverterVA: round(minInverterVA),
    recommendedInverterVA,
    recommendedKva,
    requiredSurgeVA: round(surgeVA),
    utilizationPct,
    isUndersized,
  };
}

function clampPf(pf: number): number {
  return Math.min(1, Math.max(0.1, pf));
}
