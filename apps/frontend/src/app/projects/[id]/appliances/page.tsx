"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Badge, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatKwh, formatWatts } from "@/lib/format";

const PRIORITIES = ["ESSENTIAL", "IMPORTANT", "OPTIONAL"];
const PRIORITY_TONE: Record<string, "bad" | "warn" | "default"> = {
  ESSENTIAL: "bad",
  IMPORTANT: "warn",
  OPTIONAL: "default",
};

const emptyForm = {
  catalogApplianceId: "",
  name: "",
  category: "other",
  quantity: 1,
  ratedWatts: 100,
  surgeWatts: 100,
  voltage: 230,
  powerFactor: 0.9,
  hoursPerDay: 4,
  daysPerMonth: 30,
  startTime: "",
  priority: "IMPORTANT",
};

export default function AppliancesPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const projectId = params.id;

  const [appliances, setAppliances] = useState<any[] | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    try {
      const [items, cats] = await Promise.all([api.appliances.list(projectId), api.appliances.categories()]);
      setAppliances(items);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load appliances.");
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!catalogQuery) {
      setCatalog([]);
      return;
    }
    const timeout = setTimeout(() => {
      api.appliances.catalog({ q: catalogQuery }).then(setCatalog).catch(() => setCatalog([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [catalogQuery]);

  function pickCatalogAppliance(item: any) {
    setForm((f) => ({
      ...f,
      catalogApplianceId: item.id,
      name: item.name,
      category: item.category?.slug ?? "other",
      ratedWatts: item.ratedWatts,
      surgeWatts: item.surgeWatts ?? item.ratedWatts,
      voltage: item.voltage,
      powerFactor: item.powerFactor,
    }));
    setCatalogQuery("");
    setCatalog([]);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, startTime: form.startTime || undefined, catalogApplianceId: form.catalogApplianceId || undefined };
      if (editingId) {
        await api.appliances.update(projectId, editingId, payload);
      } else {
        await api.appliances.create(projectId, payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save appliance.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: any) {
    setForm({
      catalogApplianceId: a.catalogApplianceId ?? "",
      name: a.name,
      category: a.category,
      quantity: a.quantity,
      ratedWatts: a.ratedWatts,
      surgeWatts: a.surgeWatts,
      voltage: a.voltage,
      powerFactor: a.powerFactor,
      hoursPerDay: a.hoursPerDay,
      daysPerMonth: a.daysPerMonth,
      startTime: a.startTime ?? "",
      priority: a.priority,
    });
    setEditingId(a.id);
    setShowForm(true);
  }

  async function remove(id: string) {
    if (!confirm("Remove this appliance?")) return;
    await api.appliances.remove(projectId, id);
    await load();
  }

  async function duplicate(id: string) {
    await api.appliances.duplicate(projectId, id);
    await load();
  }

  const grouped = useMemo(() => {
    if (!appliances) return {};
    return appliances.reduce<Record<string, any[]>>((acc, a) => {
      (acc[a.category] ??= []).push(a);
      return acc;
    }, {});
  }, [appliances]);

  if (!ready) return null;

  return (
    <Shell nav={projectNav(projectId)} title="Appliances" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          className="btn-primary"
          onClick={() => {
            setForm({ ...emptyForm });
            setEditingId(null);
            setShowForm((v) => !v);
          }}
        >
          + Add Appliance
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitForm} className="card mb-6 space-y-4 p-5">
          <div className="relative">
            <label className="label">Search appliance database</label>
            <input
              className="input"
              placeholder="e.g. Air Conditioner"
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
            />
            {catalog.length > 0 && (
              <div className="card absolute z-10 mt-1 max-h-56 w-full overflow-y-auto p-1">
                {catalog.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => pickCatalogAppliance(item)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <span>{item.name}</span>
                    <span className="text-xs text-black/40">{item.ratedWatts} W</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Rated Watts</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.ratedWatts}
                onChange={(e) => setForm({ ...form, ratedWatts: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Surge Watts</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.surgeWatts}
                onChange={(e) => setForm({ ...form, surgeWatts: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Hours / day</label>
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                className="input"
                value={form.hoursPerDay}
                onChange={(e) => setForm({ ...form, hoursPerDay: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Days / month</label>
              <input
                type="number"
                min={0}
                max={31}
                className="input"
                value={form.daysPerMonth}
                onChange={(e) => setForm({ ...form, daysPerMonth: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Start time (optional)</label>
              <input
                type="time"
                className="input"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p[0] + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Add appliance"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {appliances === null ? (
        <Spinner />
      ) : appliances.length === 0 ? (
        <EmptyState title="No appliances yet" description="Add your first appliance, or search the built-in database above." />
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
              {category.replace(/-/g, " ")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <div key={a.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div className="font-medium">
                      {a.quantity} × {a.name}
                    </div>
                    <Badge tone={PRIORITY_TONE[a.priority]}>{a.priority}</Badge>
                  </div>
                  <div className="mt-2 space-y-0.5 text-sm text-black/60 dark:text-white/60">
                    <div>Running: {formatWatts(a.ratedWatts * a.quantity)}</div>
                    <div>Surge: {formatWatts(a.surgeWatts * a.quantity)}</div>
                    <div>Usage: {a.hoursPerDay} hr/day</div>
                    <div>Daily: {formatKwh((a.ratedWatts * a.quantity * a.hoursPerDay) / 1000)}</div>
                  </div>
                  <div className="mt-3 flex gap-2 text-xs">
                    <button className="btn-secondary !px-2 !py-1" onClick={() => startEdit(a)}>
                      Edit
                    </button>
                    <button className="btn-secondary !px-2 !py-1" onClick={() => duplicate(a.id)}>
                      Duplicate
                    </button>
                    <button className="btn-secondary !px-2 !py-1 text-red-600" onClick={() => remove(a.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </Shell>
  );
}
