"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner, StatCard } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatKwh, formatPct } from "@/lib/format";

export default function EnergySavingsPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const projectId = params.id;

  const [analysis, setAnalysis] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [simulation, setSimulation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.energyAnalysis
      .analyze(projectId)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load energy analysis."))
      .then((res) => res && setAnalysis(res));
  }, [ready, projectId]);

  function toggle(id?: string) {
    if (!id) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function simulate() {
    if (selected.length === 0) return;
    setSimulating(true);
    setError(null);
    try {
      setSimulation(await api.energyAnalysis.simulate(projectId, selected));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  }

  if (!ready || !analysis) return <div className="p-12"><Spinner /></div>;

  const scoreTone = analysis.efficiencyScore >= 80 ? "good" : analysis.efficiencyScore >= 50 ? "warn" : "bad";

  return (
    <Shell nav={projectNav(projectId)} title="Energy-Saving Center" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Efficiency Score" value={`${analysis.efficiencyScore}/100`} tone={scoreTone as any} />
        <StatCard label="Total Monthly Usage" value={formatKwh(analysis.totalMonthlyKwh)} />
        <StatCard label="Potential Monthly Savings" value={formatKwh(analysis.potentialMonthlySavingsKwh)} tone="good" />
        <StatCard label="Potential Annual Savings" value={formatKwh(analysis.potentialAnnualSavingsKwh)} tone="good" />
      </div>

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Top Consumers
        </h3>
        <div className="card divide-y divide-[rgb(var(--border))]">
          {analysis.topConsumers.length === 0 ? (
            <div className="p-4 text-sm text-black/50 dark:text-white/50">No consumption data yet.</div>
          ) : (
            analysis.topConsumers.map((c: any) => (
              <div key={c.applianceId ?? c.name} className="flex items-center gap-3 px-4 py-3">
                <div className="w-40 shrink-0 text-sm">{c.name}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, c.sharePct)}%` }} />
                </div>
                <div className="w-32 shrink-0 text-right text-xs text-black/50 dark:text-white/50">
                  {formatKwh(c.monthlyKwh)} · {formatPct(c.sharePct)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Replacement Suggestions
          </h3>
          {selected.length > 0 && (
            <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={simulate} disabled={simulating}>
              {simulating ? "Simulating…" : `Simulate ${selected.length} selected`}
            </button>
          )}
        </div>
        {analysis.suggestions.length === 0 ? (
          <div className="card p-4 text-sm text-emerald-600">✓ No obvious inefficient appliances detected.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {analysis.suggestions.map((s: any) => (
              <label key={s.applianceId ?? s.name} className="card flex cursor-pointer items-start gap-3 p-4">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.includes(s.applianceId)}
                  onChange={() => toggle(s.applianceId)}
                />
                <div>
                  <div className="text-sm font-medium">
                    {s.name} → {s.suggestion}
                  </div>
                  <div className="mt-1 text-xs text-black/50 dark:text-white/50">{s.note}</div>
                  <div className="mt-2 text-sm text-emerald-600">
                    Save ~{formatKwh(s.estimatedMonthlySavingsKwh)}/mo
                    {s.estimatedMonthlySavings != null && ` (${formatCurrency(s.estimatedMonthlySavings)})`}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {simulation && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Simulated Impact</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Current Monthly Usage" value={formatKwh(simulation.currentMonthlyKwh)} />
            <StatCard label="Projected Monthly Usage" value={formatKwh(simulation.projectedMonthlyKwh)} tone="good" />
            {simulation.currentBill != null && (
              <>
                <StatCard label="Current Bill" value={formatCurrency(simulation.currentBill)} />
                <StatCard label="Projected Bill" value={formatCurrency(simulation.projectedBill)} tone="good" />
              </>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
