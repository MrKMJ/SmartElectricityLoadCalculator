import { LoadItemResult } from "./types";
import { round } from "./load.engine";

export interface RecommendationInput {
  peakRunningWatts: number;
  peakSurgeWatts: number;
  monthlyKwh: number;
  items: LoadItemResult[];
  inverterVA?: number; // if the project already has a selected/sized inverter
  batteryEstimatedRuntimeHours?: number;
  desiredBackupHours?: number;
}

export interface GeneratedRecommendation {
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  meta?: Record<string, unknown>;
}

/**
 * Recommendation Engine (Architecture.docx §23/§14).
 * Deterministic, rule-based — no ML/AI involved. Surfaces overload risk,
 * undersized backup systems, and the biggest energy consumers so the UI can
 * render "Safety & Alerts" and "Energy-Saving Center" without bespoke logic
 * in every controller.
 */
export function generateRecommendations(input: RecommendationInput): GeneratedRecommendation[] {
  const recs: GeneratedRecommendation[] = [];

  if (input.inverterVA) {
    const utilizationPct = round((input.peakSurgeWatts / input.inverterVA) * 100, 1);
    if (input.peakSurgeWatts > input.inverterVA) {
      recs.push({
        type: "inverter",
        severity: "CRITICAL",
        message: `Your peak surge load (${round(input.peakSurgeWatts)} W) exceeds the selected inverter capacity (${input.inverterVA} VA). The inverter is undersized.`,
        meta: { utilizationPct },
      });
    } else if (utilizationPct >= 85) {
      recs.push({
        type: "inverter",
        severity: "WARNING",
        message: `Your peak load is close to the selected inverter capacity (${utilizationPct}% utilized).`,
        meta: { utilizationPct },
      });
    }
  }

  if (
    input.desiredBackupHours != null &&
    input.batteryEstimatedRuntimeHours != null &&
    input.batteryEstimatedRuntimeHours < input.desiredBackupHours
  ) {
    recs.push({
      type: "battery",
      severity: "WARNING",
      message: `Estimated battery backup time (${round(input.batteryEstimatedRuntimeHours, 1)}h) is below your desired backup duration (${input.desiredBackupHours}h).`,
    });
  }

  const totalKwh = input.items.reduce((sum, i) => sum + i.monthlyKwh, 0);
  const ranked = [...input.items]
    .filter((i) => i.monthlyKwh > 0)
    .sort((a, b) => b.monthlyKwh - a.monthlyKwh);

  if (ranked.length > 0 && totalKwh > 0) {
    const top = ranked[0];
    const sharePct = round((top.monthlyKwh / totalKwh) * 100, 1);
    if (sharePct >= 30) {
      recs.push({
        type: "energy_saving",
        severity: "INFO",
        message: `${top.name} accounts for ${sharePct}% of your estimated monthly consumption (${round(top.monthlyKwh)} kWh). Reducing its usage hours would meaningfully lower your bill.`,
        meta: { applianceId: top.applianceId, sharePct },
      });
    }
  }

  if (input.peakRunningWatts > 0 && input.peakSurgeWatts / input.peakRunningWatts > 1.6) {
    recs.push({
      type: "surge",
      severity: "WARNING",
      message:
        "Several high-surge appliances appear to start around the same time. Staggering their start times would reduce your peak surge requirement and could allow a smaller inverter/generator.",
    });
  }

  return recs;
}
