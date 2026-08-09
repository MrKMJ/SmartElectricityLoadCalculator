"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Badge, ErrorBanner, Spinner, StatCard } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatKwh, formatWatts } from "@/lib/format";

export default function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<any>(null);
  const [calc, setCalc] = useState<any>(null);
  const [inverter, setInverter] = useState<any>(null);
  const [solar, setSolar] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  async function loadAll() {
    try {
      const [proj, calcs, inv, sol, recs] = await Promise.all([
        api.projects.get(projectId),
        api.calculations.list(projectId),
        api.sizing.inverter.latest(projectId).catch(() => null),
        api.sizing.solar.latest(projectId).catch(() => null),
        api.recommendations.list(projectId).catch(() => []),
      ]);
      setProject(proj);
      setCalc(calcs[0] ?? null);
      setInverter(inv);
      setSolar(sol);
      setRecommendations(recs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load project.");
    }
  }

  useEffect(() => {
    if (ready) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function runCalculation() {
    setCalculating(true);
    setError(null);
    try {
      await api.calculations.run(projectId);
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Calculation failed.");
    } finally {
      setCalculating(false);
    }
  }

  if (!ready || !project) return <div className="p-12"><Spinner /></div>;

  const activeRecs = recommendations.filter((r) => !r.resolvedAt);

  return (
    <Shell nav={projectNav(projectId)} title={project.name} backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={runCalculation} disabled={calculating}>
          {calculating ? "Calculating…" : "🧮 Calculate Load"}
        </button>
        <button className="btn-secondary" onClick={() => router.push(`/projects/${projectId}/appliances`)}>
          + Add Appliance
        </button>
        <button className="btn-secondary" onClick={() => router.push(`/projects/${projectId}/sizing/inverter`)}>
          Size Inverter
        </button>
        <button className="btn-secondary" onClick={() => router.push(`/projects/${projectId}/sizing/solar`)}>
          Size Solar
        </button>
        <button className="btn-secondary" onClick={() => router.push(`/projects/${projectId}/bill`)}>
          Estimate Bill
        </button>
      </div>

      {!calc ? (
        <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">
          No calculation yet. Add some appliances, then click <strong>Calculate Load</strong>.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Connected Load" value={formatWatts(calc.connectedWatts)} />
          <StatCard label="Running Load" value={formatWatts(calc.runningWatts)} />
          <StatCard
            label="Peak Demand"
            value={formatWatts(calc.peakWatts)}
            sub={`Surge: ${formatWatts(calc.surgeWatts)}`}
            tone={calc.surgeWatts && inverter && calc.surgeWatts > inverter.recommendedInverterVA ? "bad" : "default"}
          />
          <StatCard label="Daily Consumption" value={formatKwh(calc.dailyKwh)} />
          <StatCard label="Monthly Consumption" value={formatKwh(calc.monthlyKwh)} />
          <StatCard label="Annual Consumption" value={formatKwh(calc.annualKwh)} />
          <StatCard label="Estimated Monthly Bill" value={formatCurrency(calc.estimatedBill, project.currency)} />
          <StatCard
            label="Recommended Inverter"
            value={inverter ? `${inverter.recommendedKva.toFixed(1)} kVA` : "Not sized yet"}
          />
          <StatCard
            label="Recommended Solar"
            value={solar ? `${solar.requiredKw.toFixed(1)} kW` : "Not sized yet"}
            sub={solar ? `${solar.panelQuantity} panels` : undefined}
          />
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Alerts & Recommendations
        </h2>
        {activeRecs.length === 0 ? (
          <div className="card p-4 text-sm text-emerald-600">✓ No active warnings.</div>
        ) : (
          <div className="card divide-y divide-[rgb(var(--border))]">
            {activeRecs.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <Badge tone={r.severity === "CRITICAL" ? "bad" : r.severity === "WARNING" ? "warn" : "default"}>
                  {r.severity}
                </Badge>
                <span className="text-sm">{r.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
