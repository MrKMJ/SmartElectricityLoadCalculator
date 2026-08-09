"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner, StatCard } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatKwh } from "@/lib/format";

export default function BillPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const projectId = params.id;

  const [project, setProject] = useState<any>(null);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [selectedTariff, setSelectedTariff] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);

  async function load() {
    try {
      const [proj, allTariffs, current, billHistory] = await Promise.all([
        api.projects.get(projectId),
        api.tariffs.list(),
        api.tariffs.getProjectTariff(projectId).catch(() => null),
        api.bills.list(projectId).catch(() => []),
      ]);
      setProject(proj);
      setTariffs(allTariffs);
      setSelectedTariff(current?.tariffId ?? allTariffs[0]?.id ?? null);
      setBills(billHistory);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load billing data.");
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function saveTariff() {
    if (!selectedTariff) return;
    setSaving(true);
    try {
      await api.tariffs.setProjectTariff(projectId, selectedTariff);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save tariff.");
    } finally {
      setSaving(false);
    }
  }

  async function calculateBill() {
    setCalculating(true);
    setError(null);
    try {
      await saveTariff();
      const res = await api.bills.calculate(projectId);
      setResult(res);
      setBills(await api.bills.list(projectId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bill calculation failed. Run a load calculation first.");
    } finally {
      setCalculating(false);
    }
  }

  if (!ready || !project) return <div className="p-12"><Spinner /></div>;

  return (
    <Shell nav={projectNav(projectId)} title="Bill Estimator" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="card mb-6 flex flex-wrap items-end gap-4 p-4">
        <div className="min-w-[240px]">
          <label className="label">Tariff plan</label>
          <select className="input" value={selectedTariff ?? ""} onChange={(e) => setSelectedTariff(e.target.value)}>
            {tariffs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.currency})
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={calculateBill} disabled={calculating || saving}>
          {calculating ? "Calculating…" : "💵 Calculate Bill"}
        </button>
      </div>

      {result && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Energy Charge" value={formatCurrency(result.bill.energyCharge, project.currency)} />
            <StatCard label="Fixed + Taxes" value={formatCurrency(result.bill.fixedCharges + result.bill.taxes, project.currency)} />
            <StatCard label="Estimated Total" value={formatCurrency(result.bill.calculatedAmount, project.currency)} tone="good" />
          </div>

          <div className="card mb-6 overflow-x-auto p-4">
            <h3 className="mb-3 text-sm font-semibold">Slab Breakdown ({formatKwh(result.bill.inputKwh)})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border))] text-left text-xs uppercase text-black/40 dark:text-white/40">
                  <th className="py-2">Slab</th>
                  <th className="py-2">kWh in slab</th>
                  <th className="py-2">Rate</th>
                  <th className="py-2">Charge</th>
                </tr>
              </thead>
              <tbody>
                {result.breakdown.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-[rgb(var(--border))] last:border-0">
                    <td className="py-2">
                      {s.minKwh}–{s.maxKwh ?? "∞"} kWh
                    </td>
                    <td className="py-2">{s.kwhInSlab}</td>
                    <td className="py-2">{formatCurrency(s.rate, project.currency)}/kWh</td>
                    <td className="py-2">{formatCurrency(s.charge, project.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {bills.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Bill History</h3>
          <ul className="divide-y divide-[rgb(var(--border))] text-sm">
            {bills.map((b) => (
              <li key={b.id} className="flex justify-between py-2">
                <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                <span className="text-black/50 dark:text-white/50">
                  {formatKwh(b.inputKwh)} → {formatCurrency(b.calculatedAmount, project.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Shell>
  );
}
