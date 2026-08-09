"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Badge, ErrorBanner, Spinner, StatCard } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatKwh } from "@/lib/format";

export default function SolarSizingPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const projectId = params.id;

  const [panelWattage, setPanelWattage] = useState(550);
  const [desiredCoveragePct, setDesiredCoveragePct] = useState(100);
  const [electricityRatePerKwh, setElectricityRatePerKwh] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.sizing.solar
      .latest(projectId)
      .then(setResult)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, projectId]);

  async function calculate() {
    setCalculating(true);
    setError(null);
    try {
      const res = await api.sizing.solar.calculate(projectId, {
        panelWattage,
        desiredCoveragePct,
        electricityRatePerKwh: electricityRatePerKwh ? Number(electricityRatePerKwh) : undefined,
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
    <Shell nav={projectNav(projectId)} title="Solar Sizing" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="card mb-6 grid gap-4 p-4 sm:grid-cols-4">
        <div>
          <label className="label">Panel wattage (W)</label>
          <input type="number" className="input" value={panelWattage} onChange={(e) => setPanelWattage(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Desired coverage (%)</label>
          <input
            type="number"
            min={1}
            max={100}
            className="input"
            value={desiredCoveragePct}
            onChange={(e) => setDesiredCoveragePct(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Electricity rate ($/kWh, optional)</label>
          <input className="input" value={electricityRatePerKwh} onChange={(e) => setElectricityRatePerKwh(e.target.value)} />
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
        <>
          <div className="mb-2">
            <Badge tone={result.dataSource === "nrel_pvwatts" ? "good" : "default"}>
              {result.dataSource === "nrel_pvwatts" ? "NREL PVWatts data" : "Formula estimate"}
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="System Size" value={`${result.requiredKw.toFixed(2)} kW`} tone="good" />
            <StatCard label="Panel Quantity" value={`${result.panelQuantity}`} />
            <StatCard label="Est. Daily Generation" value={formatKwh(result.estimatedDailyGenKwh)} />
            <StatCard label="Est. Monthly Generation" value={formatKwh(result.estimatedMonthlyGenKwh)} />
            <StatCard label="Coverage" value={`${result.actualCoveragePct.toFixed(0)}%`} />
            {result.estimatedMonthlySavings != null && (
              <StatCard label="Est. Monthly Savings" value={formatCurrency(result.estimatedMonthlySavings)} tone="good" />
            )}
            {result.paybackYears != null && <StatCard label="Payback Period" value={`${result.paybackYears.toFixed(1)} yrs`} />}
          </div>
        </>
      )}
    </Shell>
  );
}
