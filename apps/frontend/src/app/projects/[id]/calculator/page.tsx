"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner, StatCard } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatKwh, formatWatts } from "@/lib/format";

export default function CalculatorPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const projectId = params.id;

  const [safetyMargin, setSafetyMargin] = useState(20);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function loadHistory() {
    const list = await api.calculations.list(projectId).catch(() => []);
    setHistory(list);
    if (list[0]) {
      const detail = await api.calculations.get(list[0].id).catch(() => null);
      if (detail) {
        const analyses = await api.loadAnalysis.list(projectId).catch(() => []);
        setResult({ calculation: detail, peak: analyses[0] });
      }
    }
  }

  useEffect(() => {
    if (ready) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function runCalculation() {
    setRunning(true);
    setError(null);
    try {
      const res = await api.calculations.run(projectId, { safetyMargin });
      setResult({ calculation: res.calculation, peak: res.peak, contributors: res.contributors, bill: res.bill });
      await loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Calculation failed.");
    } finally {
      setRunning(false);
    }
  }

  const chartData =
    result?.peak?.timeline?.map((p: any) => ({ time: p.time, Running: p.runningWatts, Surge: p.surgeWatts })) ?? [];

  if (!ready) return null;

  return (
    <Shell nav={projectNav(projectId)} title="Load Calculator" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="card mb-6 flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="label">Safety margin (%)</label>
          <input
            type="number"
            className="input w-32"
            min={0}
            max={200}
            value={safetyMargin}
            onChange={(e) => setSafetyMargin(Number(e.target.value))}
          />
        </div>
        <button className="btn-primary" onClick={runCalculation} disabled={running}>
          {running ? "Calculating…" : "🧮 Run Calculation"}
        </button>
      </div>

      {!result ? (
        <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">
          Run a calculation to see your connected load, peak demand, and consumption estimate.
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Connected Load" value={formatWatts(result.calculation.connectedWatts)} />
            <StatCard label="Running Load" value={formatWatts(result.calculation.runningWatts)} />
            <StatCard label="Peak Running" value={formatWatts(result.peak?.peakRunningWatts)} />
            <StatCard
              label="Peak Surge"
              value={formatWatts(result.peak?.peakSurgeWatts)}
              sub={`at ${result.peak?.peakTime ?? "—"}`}
              tone="warn"
            />
            <StatCard label="Daily kWh" value={formatKwh(result.calculation.dailyKwh)} />
            <StatCard label="Monthly kWh" value={formatKwh(result.calculation.monthlyKwh)} />
            <StatCard label="Annual kWh" value={formatKwh(result.calculation.annualKwh)} />
          </div>

          {chartData.length > 0 && (
            <div className="card mb-6 p-4">
              <h3 className="mb-3 text-sm font-semibold">24-Hour Load Timeline</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="surge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="running" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18813f" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#18813f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="time" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Surge" stroke="#f59e0b" fill="url(#surge)" />
                  <Area type="monotone" dataKey="Running" stroke="#18813f" fill="url(#running)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {result.calculation.items?.length > 0 && (
            <div className="card mb-6 overflow-x-auto p-4">
              <h3 className="mb-3 text-sm font-semibold">Appliance Breakdown</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgb(var(--border))] text-left text-xs uppercase text-black/40 dark:text-white/40">
                    <th className="py-2">Appliance</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2">Running W</th>
                    <th className="py-2">Surge W</th>
                    <th className="py-2">Daily kWh</th>
                    <th className="py-2">Monthly kWh</th>
                  </tr>
                </thead>
                <tbody>
                  {result.calculation.items.map((item: any) => (
                    <tr key={item.id} className="border-b border-[rgb(var(--border))] last:border-0">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2">{item.quantity}</td>
                      <td className="py-2">{item.runningWatts}</td>
                      <td className="py-2">{item.surgeWatts}</td>
                      <td className="py-2">{item.dailyKwh.toFixed(2)}</td>
                      <td className="py-2">{item.monthlyKwh.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Recent Calculations</h3>
          <ul className="divide-y divide-[rgb(var(--border))] text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between py-2">
                <span>{new Date(h.createdAt).toLocaleString()}</span>
                <span className="text-black/50 dark:text-white/50">
                  {formatWatts(h.peakWatts)} peak · {formatKwh(h.monthlyKwh)}/mo
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Shell>
  );
}
