import { LoadEngineApplianceInput } from "./types";
import { calculateLoadSummary, round } from "./load.engine";
import { buildPeakLoadTimeline } from "./peak-load.engine";

export interface EssentialLoadResult {
  essentialRunningW: number;
  essentialPeakW: number;
  fullHomeRunningW: number;
  fullHomePeakW: number;
  essentialCoveragePct: number;
}

/**
 * Essential Load Engine (Architecture.docx §12/§20).
 * Splits the appliance list by user-assigned priority so backup systems can
 * be sized around only what's essential during an outage, while still
 * reporting the full-home figures for comparison.
 */
export function calculateEssentialLoad(appliances: LoadEngineApplianceInput[]): EssentialLoadResult {
  const essential = appliances.filter((a) => a.priority === "ESSENTIAL");

  const fullSummary = calculateLoadSummary(appliances);
  const essentialSummary = calculateLoadSummary(essential);

  const fullPeak = buildPeakLoadTimeline(appliances);
  const essentialPeak = buildPeakLoadTimeline(essential);

  return {
    essentialRunningW: essentialSummary.runningWatts,
    essentialPeakW: essentialPeak.peakSurgeWatts,
    fullHomeRunningW: fullSummary.runningWatts,
    fullHomePeakW: fullPeak.peakSurgeWatts,
    essentialCoveragePct:
      fullSummary.runningWatts > 0
        ? round((essentialSummary.runningWatts / fullSummary.runningWatts) * 100, 1)
        : 0,
  };
}
