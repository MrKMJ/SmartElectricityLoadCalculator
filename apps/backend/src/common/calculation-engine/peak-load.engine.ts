import { LoadEngineApplianceInput, PeakLoadResult, TimelinePoint } from "./types";
import { round } from "./load.engine";

/**
 * Peak & Surge Load Analysis (Architecture.docx §4 / §12).
 *
 * We don't simply sum every surge wattage together — that overstates the
 * system requirement, since surge current is transient (motor/compressor
 * start-up) and appliances rarely all start in the same instant. Instead we
 * build an hour-by-hour timeline:
 *
 *   - runningWatts(h)  = sum of rated watts for appliances active at hour h
 *   - surgeWatts(h)    = runningWatts(h) + the *extra* surge draw
 *                        (surgeWatts - ratedWatts) of appliances that START
 *                        at hour h, since that's the only moment the surge
 *                        current is actually drawn.
 *
 * An appliance with no startTime is treated as always-on for hoursPerDay,
 * starting at hour 0 by default; the frontend's schedule editor lets users
 * set a real start time for a more realistic timeline.
 */
export function buildPeakLoadTimeline(appliances: LoadEngineApplianceInput[]): PeakLoadResult {
  const timeline: TimelinePoint[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    time: `${String(hour).padStart(2, "0")}:00`,
    runningWatts: 0,
    surgeWatts: 0,
  }));

  for (const appliance of appliances) {
    const quantity = Math.max(0, appliance.quantity);
    const runningW = appliance.ratedWatts * quantity;
    const surgeExtra = Math.max(0, (appliance.surgeWatts ?? appliance.ratedWatts) - appliance.ratedWatts) * quantity;
    const startHour = parseStartHour(appliance.startTime);
    const duration = Math.min(24, Math.max(0, Math.round(appliance.hoursPerDay)));

    for (let step = 0; step < duration; step++) {
      const hour = (startHour + step) % 24;
      timeline[hour].runningWatts += runningW;
      timeline[hour].surgeWatts += runningW;
      if (step === 0) {
        // Surge current only appears in the moment the appliance switches on.
        timeline[hour].surgeWatts += surgeExtra;
      }
    }
  }

  timeline.forEach((point) => {
    point.runningWatts = round(point.runningWatts);
    point.surgeWatts = round(point.surgeWatts);
  });

  const peakRunningPoint = timeline.reduce((max, p) => (p.runningWatts > max.runningWatts ? p : max), timeline[0]);
  const peakSurgePoint = timeline.reduce((max, p) => (p.surgeWatts > max.surgeWatts ? p : max), timeline[0]);

  const contributors = appliances
    .map((a) => ({ name: a.name, watts: round(a.ratedWatts * Math.max(0, a.quantity)) }))
    .sort((a, b) => b.watts - a.watts)
    .slice(0, 5);

  return {
    peakRunningWatts: peakRunningPoint.runningWatts,
    peakSurgeWatts: peakSurgePoint.surgeWatts,
    peakTime: peakSurgePoint.time,
    timeline,
    contributors,
  };
}

function parseStartHour(startTime?: string): number {
  if (!startTime) return 0;
  const [h] = startTime.split(":").map(Number);
  if (Number.isNaN(h)) return 0;
  return Math.min(23, Math.max(0, h));
}
