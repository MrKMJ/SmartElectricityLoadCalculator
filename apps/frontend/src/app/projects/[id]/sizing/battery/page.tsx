"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner, StatCard } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";

const BATTERY_TYPES = ["LEAD_ACID", "AGM", "GEL", "LITHIUM"];

export default function BatterySizingPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const projectId = params.id;

  const [backupHours, setBackupHours] = useState(4);
  const [batteryVoltage, setBatteryVoltage] = useState(12);
  const [batteryType, setBatteryType] = useState("LEAD_ACID");
  const [singleBatteryAh, setSingleBatteryAh] = useState(100);
  const [safetyMargin, setSafetyMargin] = useState(20);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.sizing.battery
      .latest(projectId)
      .then(setResult)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, projectId]);

  async function calculate() {
    setCalculating(true);
    setError(null);
    try {
      const res = await api.sizing.battery.calculate(projectId, {
        backupHours,
        batteryVoltage,
        batteryType,
        singleBatteryAh,
        safetyMargin,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sizing failed. Run a load calculation first.");
    } finally {
      setCalculating(false);
    }
  }

  if (!ready || loading) return <div className="p-12"><Spinner /></div>;

  return (
    <Shell nav={projectNav(projectId)} title="Battery Sizing" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="card mb-6 grid gap-4 p-4 sm:grid-cols-5">
        <div>
          <label className="label">Backup duration (hours)</label>
          <input
            type="number"
            className="input"
            min={0.5}
            step={0.5}
            value={backupHours}
            onChange={(e) => setBackupHours(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Battery voltage</label>
          <input type="number" className="input" value={batteryVoltage} onChange={(e) => setBatteryVoltage(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Battery type</label>
          <select className="input" value={batteryType} onChange={(e) => setBatteryType(e.target.value)}>
            {BATTERY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Single battery (Ah)</label>
          <input
            type="number"
            className="input"
            value={singleBatteryAh}
            onChange={(e) => setSingleBatteryAh(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" onClick={calculate} disabled={calculating}>
            {calculating ? "Sizing…" : "Calculate"}
          </button>
        </div>
      </div>

      {!result ? (
        <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">
          No sizing yet — run a load calculation first, then calculate here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Required Capacity" value={`${result.requiredWh.toFixed(0)} Wh`} />
          <StatCard label="Required Ah" value={`${result.requiredAh.toFixed(0)} Ah`} />
          <StatCard label="Number of Batteries" value={`${result.numberOfBatteries}`} sub={result.configuration} />
          <StatCard label="Estimated Runtime" value={`${result.estimatedRuntimeHours.toFixed(1)} hr`} tone="good" />
        </div>
      )}
    </Shell>
  );
}
