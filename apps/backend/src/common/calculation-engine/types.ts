export interface LoadEngineApplianceInput {
  id?: string;
  name: string;
  quantity: number;
  ratedWatts: number;
  surgeWatts?: number;
  voltage?: number;
  powerFactor?: number;
  hoursPerDay: number;
  daysPerMonth?: number;
  startTime?: string; // "HH:mm" — used by the peak-load timeline
  priority?: "ESSENTIAL" | "IMPORTANT" | "OPTIONAL";
}

export interface LoadItemResult {
  applianceId?: string;
  name: string;
  quantity: number;
  runningWatts: number; // ratedWatts * quantity
  surgeWatts: number; // surgeWatts * quantity
  hoursPerDay: number;
  dailyKwh: number;
  monthlyKwh: number;
}

export interface LoadSummary {
  connectedWatts: number;
  runningWatts: number;
  surgeWatts: number;
  dailyKwh: number;
  monthlyKwh: number;
  annualKwh: number;
  items: LoadItemResult[];
}

export interface TimelinePoint {
  hour: number; // 0-23
  time: string; // "HH:00"
  runningWatts: number;
  surgeWatts: number;
}

export interface PeakLoadResult {
  peakRunningWatts: number;
  peakSurgeWatts: number;
  peakTime: string;
  timeline: TimelinePoint[];
  contributors: Array<{ name: string; watts: number }>;
}
