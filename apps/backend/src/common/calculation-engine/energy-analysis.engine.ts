import { round } from "./load.engine";

export interface EnergyAnalysisApplianceInput {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  ratedWatts: number;
  hoursPerDay: number;
  daysPerMonth: number;
  monthlyKwh: number;
}

export interface ConsumerRanking {
  applianceId?: string;
  name: string;
  category: string;
  monthlyKwh: number;
  sharePct: number;
}

export interface ReplacementSuggestion {
  applianceId?: string;
  name: string;
  suggestion: string;
  reductionPct: number;
  currentWatts: number;
  suggestedWatts: number;
  estimatedMonthlySavingsKwh: number;
  estimatedAnnualSavingsKwh: number;
  estimatedMonthlySavings: number | null;
  estimatedAnnualSavings: number | null;
  note: string;
}

export interface EnergyAnalysisResult {
  totalMonthlyKwh: number;
  topConsumers: ConsumerRanking[];
  suggestions: ReplacementSuggestion[];
  potentialMonthlySavingsKwh: number;
  potentialAnnualSavingsKwh: number;
  efficiencyScore: number; // 0-100, higher = more efficient (less easily-recoverable waste)
}

// A small, explainable rule set rather than a black-box model — matches the
// doc's "Energy-Saving Recommendations" / "Energy-Saving Center" features:
// identify inefficient appliance classes and estimate the savings from a
// like-for-like efficient replacement.
const REPLACEMENT_RULES: Array<{
  match: (name: string, category: string) => boolean;
  exclude?: (name: string) => boolean;
  suggestion: string;
  reductionPct: number;
  note: string;
}> = [
  {
    match: (n) => /incandescent|cfl|halogen/.test(n) || (/\bbulb\b/.test(n) && !/led/.test(n)),
    suggestion: "LED bulb",
    reductionPct: 0.85,
    note: "LED bulbs use roughly 85% less energy than incandescent/CFL for the same brightness.",
  },
  {
    match: (n, c) => c === "cooling" && /air condition|\bac\b/.test(n),
    exclude: (n) => /inverter/.test(n),
    suggestion: "Inverter air conditioner",
    reductionPct: 0.3,
    note: "Inverter ACs modulate compressor speed instead of cycling on/off, typically cutting consumption ~30%.",
  },
  {
    match: (n, c) => c === "kitchen" && /refrigerator|fridge/.test(n),
    exclude: (n) => /5.star|inverter|efficient/.test(n),
    suggestion: "5-star energy-rated refrigerator",
    reductionPct: 0.25,
    note: "Modern energy-rated refrigerators use significantly less standby and compressor energy.",
  },
  {
    match: (n) => /water heater|geyser/.test(n),
    exclude: (n) => /tankless|instant|solar|heat pump/.test(n),
    suggestion: "Tankless/instant or solar water heater",
    reductionPct: 0.2,
    note: "Tankless heaters avoid standby heat loss from keeping a full tank hot continuously.",
  },
  {
    match: (n) => /washing machine|washer/.test(n),
    exclude: (n) => /front.load|efficient/.test(n),
    suggestion: "Efficient front-load washing machine",
    reductionPct: 0.15,
    note: "Front-load washers typically use less energy and water per cycle than top-load models.",
  },
  {
    match: (n, c) => c === "cooling" && /\bfan\b/.test(n),
    exclude: (n) => /bldc|efficient/.test(n),
    suggestion: "BLDC ceiling fan",
    reductionPct: 0.5,
    note: "BLDC motor fans typically use about half the energy of standard induction-motor fans.",
  },
];

export function analyzeEnergyUsage(
  appliances: EnergyAnalysisApplianceInput[],
  electricityRatePerKwh?: number,
): EnergyAnalysisResult {
  const totalMonthlyKwh = appliances.reduce((sum, a) => sum + a.monthlyKwh, 0);

  const topConsumers: ConsumerRanking[] = [...appliances]
    .filter((a) => a.monthlyKwh > 0)
    .sort((a, b) => b.monthlyKwh - a.monthlyKwh)
    .map((a) => ({
      applianceId: a.id,
      name: a.name,
      category: a.category,
      monthlyKwh: round(a.monthlyKwh),
      sharePct: totalMonthlyKwh > 0 ? round((a.monthlyKwh / totalMonthlyKwh) * 100, 1) : 0,
    }));

  const suggestions: ReplacementSuggestion[] = [];
  for (const appliance of appliances) {
    const nameLower = appliance.name.toLowerCase();
    const rule = REPLACEMENT_RULES.find(
      (r) => r.match(nameLower, appliance.category) && !(r.exclude?.(nameLower) ?? false),
    );
    if (!rule) continue;

    const suggestedWatts = round(appliance.ratedWatts * (1 - rule.reductionPct));
    const savingsWatts = appliance.ratedWatts - suggestedWatts;
    const monthlySavingsKwh = round((savingsWatts * appliance.quantity * appliance.hoursPerDay * appliance.daysPerMonth) / 1000);
    const annualSavingsKwh = round(monthlySavingsKwh * 12);

    suggestions.push({
      applianceId: appliance.id,
      name: appliance.name,
      suggestion: rule.suggestion,
      reductionPct: round(rule.reductionPct * 100, 0),
      currentWatts: appliance.ratedWatts,
      suggestedWatts,
      estimatedMonthlySavingsKwh: monthlySavingsKwh,
      estimatedAnnualSavingsKwh: annualSavingsKwh,
      estimatedMonthlySavings: electricityRatePerKwh ? round(monthlySavingsKwh * electricityRatePerKwh) : null,
      estimatedAnnualSavings: electricityRatePerKwh ? round(annualSavingsKwh * electricityRatePerKwh) : null,
      note: rule.note,
    });
  }
  suggestions.sort((a, b) => b.estimatedMonthlySavingsKwh - a.estimatedMonthlySavingsKwh);

  const potentialMonthlySavingsKwh = round(suggestions.reduce((sum, s) => sum + s.estimatedMonthlySavingsKwh, 0));
  const potentialAnnualSavingsKwh = round(potentialMonthlySavingsKwh * 12);

  // Efficiency score: 100 minus the share of current consumption that's
  // recoverable through the suggested replacements (floored at 0).
  const recoverableSharePct = totalMonthlyKwh > 0 ? (potentialMonthlySavingsKwh / totalMonthlyKwh) * 100 : 0;
  const efficiencyScore = round(Math.max(0, Math.min(100, 100 - recoverableSharePct)), 0);

  return {
    totalMonthlyKwh: round(totalMonthlyKwh),
    topConsumers,
    suggestions,
    potentialMonthlySavingsKwh,
    potentialAnnualSavingsKwh,
    efficiencyScore,
  };
}
