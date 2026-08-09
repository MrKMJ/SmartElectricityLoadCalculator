import { LoadEngineApplianceInput } from "./types";
import { buildPeakLoadTimeline } from "./peak-load.engine";
import { round } from "./load.engine";

export interface ScheduleSuggestion {
  applianceId?: string;
  name: string;
  currentStartHour: number;
  suggestedStartHour: number;
  peakContributionW: number;
  projectedPeakReductionW: number;
  message: string;
}

/**
 * Automated Schedule Optimization (Architecture.docx §13 "Load Scheduling").
 *
 * Rather than a generic bin-packing solver, this uses the same heuristic the
 * doc's own example describes: find what's driving the peak hour, and check
 * whether shifting the single biggest peak contributor to the quietest hour
 * of the day would meaningfully reduce peak demand. Never mutates data —
 * callers apply a suggestion by updating the appliance's start time.
 */
export function optimizeSchedule(appliances: LoadEngineApplianceInput[]): {
  peakSurgeWatts: number;
  peakHour: number;
  suggestions: ScheduleSuggestion[];
} {
  const timeline = buildPeakLoadTimeline(appliances);
  const peakPoint = timeline.timeline.reduce((max, p) => (p.surgeWatts > max.surgeWatts ? p : max), timeline.timeline[0]);
  const peakHour = peakPoint.hour;

  // Find the quietest hour by running load — the best candidate slot to move something into.
  const quietestPoint = timeline.timeline.reduce((min, p) => (p.runningWatts < min.runningWatts ? p : min), timeline.timeline[0]);

  const suggestions: ScheduleSuggestion[] = [];

  // Rank appliances whose scheduled start falls in the peak hour by their contribution.
  const peakContributors = appliances
    .filter((a) => parseStartHour(a.startTime) === peakHour && a.quantity > 0)
    .map((a) => ({ appliance: a, watts: a.ratedWatts * a.quantity }))
    .sort((a, b) => b.watts - a.watts);

  for (const { appliance, watts } of peakContributors.slice(0, 3)) {
    if (quietestPoint.hour === peakHour) continue;
    // Estimate the new peak if this appliance moved: subtract its running
    // contribution from the peak hour, add it to the quietest hour, and
    // recompute the max across the timeline.
    const projected = timeline.timeline.map((p) => ({ ...p }));
    projected[peakHour].runningWatts = Math.max(0, projected[peakHour].runningWatts - watts);
    projected[peakHour].surgeWatts = Math.max(0, projected[peakHour].surgeWatts - watts);
    projected[quietestPoint.hour].runningWatts += watts;
    projected[quietestPoint.hour].surgeWatts += watts;
    const newPeak = Math.max(...projected.map((p) => p.surgeWatts));

    if (newPeak < peakPoint.surgeWatts) {
      suggestions.push({
        applianceId: appliance.id,
        name: appliance.name,
        currentStartHour: peakHour,
        suggestedStartHour: quietestPoint.hour,
        peakContributionW: round(watts),
        projectedPeakReductionW: round(peakPoint.surgeWatts - newPeak),
        message: `Running ${appliance.name} at ${formatHour(peakHour)} contributes to your daily peak. Moving it to ${formatHour(
          quietestPoint.hour,
        )} would reduce your peak surge by about ${round((peakPoint.surgeWatts - newPeak) / 1000, 2)} kW.`,
      });
    }
  }

  return { peakSurgeWatts: peakPoint.surgeWatts, peakHour, suggestions };
}

function parseStartHour(startTime?: string): number {
  if (!startTime) return 0;
  const [h] = startTime.split(":").map(Number);
  if (Number.isNaN(h)) return 0;
  return Math.min(23, Math.max(0, h));
}

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}
