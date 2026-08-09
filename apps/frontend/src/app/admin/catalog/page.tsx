"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner } from "@/components/ui";
import { useRequireAdmin } from "@/lib/hooks";
import { adminNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";

const emptyForm = {
  categoryId: "",
  name: "",
  brand: "",
  ratedWatts: 100,
  surgeWatts: 100,
  voltage: 230,
  powerFactor: 0.9,
  standbyWatts: 0,
};

export default function AdminCatalogPage() {
  const { ready } = useRequireAdmin();
  const [categories, setCategories] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[] | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [cats, items] = await Promise.all([api.admin.categories(), api.appliances.catalog({})]);
      setCategories(cats);
      setCatalog(items);
      setForm((f) => ({ ...f, categoryId: f.categoryId || cats[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load catalog.");
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.admin.createAppliance(form);
      setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create appliance.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(id: string) {
    if (!confirm("Archive this catalog appliance? It will no longer appear in search.")) return;
    await api.admin.deleteAppliance(id);
    await load();
  }

  if (!ready) return null;

  return (
    <Shell nav={adminNav()} title="Appliance Catalog">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          + Add Catalog Appliance
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-6 grid gap-4 p-5 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Brand (optional)</label>
            <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div>
            <label className="label">Rated Watts</label>
            <input type="number" className="input" value={form.ratedWatts} onChange={(e) => setForm({ ...form, ratedWatts: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Surge Watts</label>
            <input type="number" className="input" value={form.surgeWatts} onChange={(e) => setForm({ ...form, surgeWatts: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Voltage</label>
            <input type="number" className="input" value={form.voltage} onChange={(e) => setForm({ ...form, voltage: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Power Factor</label>
            <input type="number" step={0.05} min={0.1} max={1} className="input" value={form.powerFactor} onChange={(e) => setForm({ ...form, powerFactor: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Add to catalog"}
            </button>
          </div>
        </form>
      )}

      {catalog === null ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))] text-left text-xs uppercase text-black/40 dark:text-white/40">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Watts</th>
                <th className="px-4 py-2">Surge</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((a) => (
                <tr key={a.id} className="border-b border-[rgb(var(--border))] last:border-0">
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2 text-black/60 dark:text-white/60">{a.category?.name}</td>
                  <td className="px-4 py-2">{a.ratedWatts} W</td>
                  <td className="px-4 py-2">{a.surgeWatts} W</td>
                  <td className="px-4 py-2 text-right">
                    <button className="text-xs text-red-600" onClick={() => archive(a.id)}>
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
