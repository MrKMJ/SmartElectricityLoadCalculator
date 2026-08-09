"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner, StatCard } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatKwh, formatWatts } from "@/lib/format";

const ACTIONS = ["ADD", "MODIFY", "REMOVE"];

const newRow = { action: "ADD", name: "", quantity: 1, ratedWatts: 100, surgeWatts: 100, hoursPerDay: 4 };

export default function ScenarioDetailPage({ params }: { params: { id: string; scenarioId: string } }) {
  const { ready } = useRequireAuth();
  const { id: projectId, scenarioId } = params;

  const [scenario, setScenario] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [addRow, setAddRow] = useState({ ...newRow });

  async function load() {
    try {
      setScenario(await api.scenarios.get(scenarioId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load scenario.");
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function updateAppliance(id: string, patch: any) {
    const current = scenario.appliances.find((a: any) => a.id === id);
    await api.scenarios.updateAppliance(scenarioId, id, { ...current, ...patch });
    await load();
  }

  async function removeAppliance(id: string) {
    await api.scenarios.removeAppliance(scenarioId, id);
    await load();
  }

  async function addAppliance(e: React.FormEvent) {
    e.preventDefault();
    if (!addRow.name) return;
    await api.scenarios.addAppliance(scenarioId, addRow);
    setAddRow({ ...newRow });
    await load();
  }

  async function calculate() {
    setCalculating(true);
    setError(null);
    try {
      await api.scenarios.calculate(scenarioId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Calculation failed.");
    } finally {
      setCalculating(false);
    }
  }

  if (!ready || !scenario) return <div className="p-12"><Spinner /></div>;

  return (
    <Shell nav={projectNav(projectId)} title={`Scenario: ${scenario.name}`} backHref={`/projects/${projectId}/scenarios`}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {scenario.result && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Peak Load" value={formatWatts(scenario.result.peakLoadW)} />
          <StatCard label="Monthly Consumption" value={formatKwh(scenario.result.monthlyKwh)} />
          <StatCard label="Estimated Bill" value={formatCurrency(scenario.result.estimatedBill)} />
          <StatCard label="Inverter Needed" value={`${(scenario.result.inverterVA / 1000).toFixed(2)} kVA`} />
        </div>
      )}

      <div className="card mb-6 overflow-x-auto p-4">
        <h3 className="mb-3 text-sm font-semibold">Scenario Appliances</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgb(var(--border))] text-left text-xs uppercase text-black/40 dark:text-white/40">
              <th className="py-2">Name</th>
              <th className="py-2">Action</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Watts</th>
              <th className="py-2">Hours/day</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {scenario.appliances.map((a: any) => (
              <tr key={a.id} className="border-b border-[rgb(var(--border))] last:border-0">
                <td className="py-2">{a.name}</td>
                <td className="py-2">
                  <select
                    className="input !py-1"
                    value={a.action}
                    onChange={(e) => updateAppliance(a.id, { action: e.target.value })}
                  >
                    {ACTIONS.map((act) => (
                      <option key={act} value={act}>
                        {act}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    className="input !w-20 !py-1"
                    value={a.quantity}
                    onChange={(e) => updateAppliance(a.id, { quantity: Number(e.target.value) })}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    className="input !w-24 !py-1"
                    value={a.ratedWatts}
                    onChange={(e) => updateAppliance(a.id, { ratedWatts: Number(e.target.value) })}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    className="input !w-20 !py-1"
                    value={a.hoursPerDay}
                    onChange={(e) => updateAppliance(a.id, { hoursPerDay: Number(e.target.value) })}
                  />
                </td>
                <td className="py-2">
                  <button className="text-xs text-red-600" onClick={() => removeAppliance(a.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form onSubmit={addAppliance} className="mt-4 flex flex-wrap items-end gap-2 border-t border-[rgb(var(--border))] pt-4">
          <input
            className="input !w-40"
            placeholder="New appliance name"
            value={addRow.name}
            onChange={(e) => setAddRow({ ...addRow, name: e.target.value })}
          />
          <input
            type="number"
            className="input !w-20"
            value={addRow.quantity}
            onChange={(e) => setAddRow({ ...addRow, quantity: Number(e.target.value) })}
          />
          <input
            type="number"
            className="input !w-24"
            placeholder="Watts"
            value={addRow.ratedWatts}
            onChange={(e) => setAddRow({ ...addRow, ratedWatts: Number(e.target.value) })}
          />
          <input
            type="number"
            className="input !w-24"
            placeholder="Hrs/day"
            value={addRow.hoursPerDay}
            onChange={(e) => setAddRow({ ...addRow, hoursPerDay: Number(e.target.value) })}
          />
          <button type="submit" className="btn-secondary">
            + Add line
          </button>
        </form>
      </div>

      <button className="btn-primary" onClick={calculate} disabled={calculating}>
        {calculating ? "Calculating…" : "🧮 Run Scenario Calculation"}
      </button>
    </Shell>
  );
}
