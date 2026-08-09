import { round } from "./load.engine";

export interface GeneratorSizingInput {
  runningLoadW: number;
  startingLoadW: number; // largest motor/compressor surge added to running load
  powerFactor?: number; // default 0.8
  safetyMarginPct?: number; // default 25 (generators tolerate less overload than inverters)
}

export interface GeneratorSizingResult {
  runningLoadW: number;
  startingLoadW: number;
  powerFactor: number;
  safetyMarginPct: number;
  minKva: number;
  recommendedKva: number;
  estimatedUtilizationPct: number;
}

/**
 * Generator Sizing Engine (Architecture.docx §19).
 * Generators must survive the single largest instantaneous starting load
 * on top of the running load of everything else already on.
 */
export function calculateGeneratorSizing(input: GeneratorSizingInput): GeneratorSizingResult {
  const powerFactor = Math.min(1, Math.max(0.1, input.powerFactor ?? 0.8));
  const safetyMarginPct = Math.max(0, input.safetyMarginPct ?? 25);

  const worstCaseW = input.runningLoadW + input.startingLoadW;
  const minKva = round(worstCaseW / (1000 * powerFactor), 2);
  const recommendedKva = round(minKva * (1 + safetyMarginPct / 100), 2);

  const estimatedUtilizationPct =
    recommendedKva > 0 ? round((input.runningLoadW / (recommendedKva * 1000 * powerFactor)) * 100, 1) : 0;

  return {
    runningLoadW: input.runningLoadW,
    startingLoadW: input.startingLoadW,
    powerFactor,
    safetyMarginPct,
    minKva,
    recommendedKva,
    estimatedUtilizationPct,
  };
}
