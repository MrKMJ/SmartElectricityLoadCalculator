"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner } from "@/components/ui";
import { useRequireAdmin } from "@/lib/hooks";
import { adminNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";

const emptySlab = { minKwh: 0, maxKwh: 100, ratePerKwh: 0.1, fixedCharge: 5, taxRatePct: 5 };

export default function AdminTariffsPage() {
  const { ready } = useRequireAdmin();
  const [tariffs, setTariffs] = useState<any[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [currency, setCurrency] = useState("USD");
  const [slabs, setSlabs] = useState([{ ...emptySlab }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setTariffs(await api.admin.tariffs());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tariffs.");
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function updateSlab(i: number, patch: Partial<typeof emptySlab>) {
    setSlabs((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.admin.createTariff({
        name,
        provider,
        countryCode,
        currency,
        slabs: slabs.map((s) => ({ ...s, maxKwh: s.maxKwh || null })),
      });
      setName("");
      setProvider("");
      setSlabs([{ ...emptySlab }]);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create tariff.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Archive this tariff?")) return;
    await api.admin.deleteTariff(id);
    await load();
  }

  if (!ready) return null;

  return (
    <Shell nav={adminNav()} title="Tariffs">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          + Add Tariff
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-6 space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label">Name</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Provider</label>
              <input className="input" required value={provider} onChange={(e) => setProvider(e.target.value)} />
            </div>
            <div>
              <label className="label">Country Code</label>
              <input className="input" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} maxLength={2} />
            </div>
            <div>
              <label className="label">Currency</label>
              <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label !mb-0">Slabs</label>
              <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => setSlabs([...slabs, { ...emptySlab, minKwh: slabs[slabs.length - 1]?.maxKwh ?? 0 }])}>
                + Add slab
              </button>
            </div>
            {slabs.map((s, i) => (
              <div key={i} className="mb-2 grid grid-cols-5 gap-2">
                <input type="number" className="input" placeholder="Min kWh" value={s.minKwh} onChange={(e) => updateSlab(i, { minKwh: Number(e.target.value) })} />
                <input type="number" className="input" placeholder="Max kWh (blank = ∞)" value={s.maxKwh ?? ""} onChange={(e) => updateSlab(i, { maxKwh: e.target.value ? Number(e.target.value) : (null as any) })} />
                <input type="number" step={0.01} className="input" placeholder="Rate/kWh" value={s.ratePerKwh} onChange={(e) => updateSlab(i, { ratePerKwh: Number(e.target.value) })} />
                <input type="number" className="input" placeholder="Fixed charge" value={s.fixedCharge} onChange={(e) => updateSlab(i, { fixedCharge: Number(e.target.value) })} />
                <input type="number" className="input" placeholder="Tax %" value={s.taxRatePct} onChange={(e) => updateSlab(i, { taxRatePct: Number(e.target.value) })} />
              </div>
            ))}
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Create tariff"}
          </button>
        </form>
      )}

      {tariffs === null ? (
        <Spinner />
      ) : (
        <div className="card divide-y divide-[rgb(var(--border))]">
          {tariffs.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium">
                  {t.name} <span className="text-black/40">({t.currency})</span>
                </div>
                <div className="text-xs text-black/40 dark:text-white/40">
                  {t.provider} · {t.slabs.length} slabs
                </div>
              </div>
              <button className="text-xs text-red-600" onClick={() => remove(t.id)}>
                Archive
              </button>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
