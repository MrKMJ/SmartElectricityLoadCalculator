"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner, StatCard } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatPct } from "@/lib/format";

export default function GeneratorSizingPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const projectId = params.id;

  const [safetyMargin, setSafetyMargin] = useState(25);
  const [powerFactor, setPowerFactor] = useState(0.8);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.sizing.generator
      .latest(projectId)
      .then(setResult)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, projectId]);

  async function calculate() {
    setCalculating(true);
    setError(null);
    try {
      const res = await api.sizing.generator.calculate(projectId, { safetyMargin, powerFactor });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sizing failed. Run a load calculation first.");
    } finally {
      setCalculating(false);
    }
  }

  if (!ready || loading) return <div className="p-12"><Spinner /></div>;

  return (
    <Shell nav={projectNav(projectId)} title="Generator Sizing" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="card mb-6 grid gap-4 p-4 sm:grid-cols-3">
        <div>
          <label className="label">Safety margin (%)</label>
          <input type="number" className="input" value={safetyMargin} onChange={(e) => setSafetyMargin(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Power factor</label>
          <input
            type="number"
            step={0.05}
            min={0.1}
            max={1}
            className="input"
            value={powerFactor}
            onChange={(e) => setPowerFactor(Number(e.target.value))}
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
          <StatCard label="Minimum Generator" value={`${result.minKva.toFixed(2)} kVA`} />
          <StatCard label="Recommended Generator" value={`${result.recommendedKva.toFixed(2)} kVA`} tone="good" />
          <StatCard label="Estimated Utilization" value={formatPct(result.estimatedUtilizationPct)} />
        </div>
      )}
    </Shell>
  );
}
