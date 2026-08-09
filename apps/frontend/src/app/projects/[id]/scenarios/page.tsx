"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatKwh, formatWatts } from "@/lib/format";

export default function ScenariosPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const projectId = params.id;

  const [scenarios, setScenarios] = useState<any[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<any>(null);

  async function load() {
    try {
      setScenarios(await api.scenarios.list(projectId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load scenarios.");
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function createScenario(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const scenario = await api.scenarios.create(projectId, name || `Scenario ${new Date().toLocaleDateString()}`);
      setName("");
      router.push(`/projects/${projectId}/scenarios/${scenario.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create scenario.");
    } finally {
      setCreating(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function compare() {
    if (selected.length === 0) return;
    const res = await api.scenarios.compare(projectId, selected);
    setComparison(res);
  }

  if (!ready) return null;

  return (
    <Shell nav={projectNav(projectId)} title="What-If Scenarios" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <form onSubmit={createScenario} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <label className="label">New scenario name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Add 2 ACs" />
        </div>
        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? "Creating…" : "+ New Scenario"}
        </button>
        {selected.length > 0 && (
          <button type="button" className="btn-secondary" onClick={compare}>
            Compare selected ({selected.length})
          </button>
        )}
      </form>

      {comparison && (
        <div className="card mb-6 overflow-x-auto p-4">
          <h3 className="mb-3 text-sm font-semibold">Comparison</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))] text-left text-xs uppercase text-black/40 dark:text-white/40">
                <th className="py-2">Config</th>
                <th className="py-2">Peak Load</th>
                <th className="py-2">Monthly kWh</th>
                <th className="py-2">Est. Bill</th>
              </tr>
            </thead>
            <tbody>
              {comparison.current && (
                <tr className="border-b border-[rgb(var(--border))]">
                  <td className="py-2 font-medium">Current</td>
                  <td className="py-2">{formatWatts(comparison.current.peakLoadW)}</td>
                  <td className="py-2">{formatKwh(comparison.current.monthlyKwh)}</td>
                  <td className="py-2">{formatCurrency(comparison.current.estimatedBill)}</td>
                </tr>
              )}
              {comparison.scenarios.map((s: any) => (
                <tr key={s.id} className="border-b border-[rgb(var(--border))] last:border-0">
                  <td className="py-2 font-medium">{s.label}</td>
                  <td className="py-2">{formatWatts(s.result?.peakLoadW)}</td>
                  <td className="py-2">{formatKwh(s.result?.monthlyKwh)}</td>
                  <td className="py-2">{formatCurrency(s.result?.estimatedBill)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scenarios === null ? (
        <Spinner />
      ) : scenarios.length === 0 ? (
        <EmptyState title="No scenarios yet" description='Try "Add 2 ACs" or "Add 5 solar panels" — create a scenario to see the impact without touching your real project.' />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="mb-2 flex items-start justify-between">
                <button className="text-left font-medium hover:underline" onClick={() => router.push(`/projects/${projectId}/scenarios/${s.id}`)}>
                  {s.name}
                </button>
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSelect(s.id)} />
              </div>
              {s.result ? (
                <div className="space-y-0.5 text-sm text-black/60 dark:text-white/60">
                  <div>Peak: {formatWatts(s.result.peakLoadW)}</div>
                  <div>Monthly: {formatKwh(s.result.monthlyKwh)}</div>
                  <div>Bill: {formatCurrency(s.result.estimatedBill)}</div>
                </div>
              ) : (
                <div className="text-sm text-black/40">Not calculated yet</div>
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
