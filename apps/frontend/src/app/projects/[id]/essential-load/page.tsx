"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner, StatCard } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatPct, formatWatts } from "@/lib/format";

const PRIORITIES = ["ESSENTIAL", "IMPORTANT", "OPTIONAL"];

export default function EssentialLoadPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const projectId = params.id;

  const [appliances, setAppliances] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [items, existing] = await Promise.all([
        api.appliances.list(projectId),
        api.essentialLoad.get(projectId).catch(() => null),
      ]);
      setAppliances(items);
      setProfile(existing);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function setPriority(id: string, priority: string) {
    setAppliances((prev) => prev.map((a) => (a.id === id ? { ...a, priority } : a)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updates = appliances.map((a) => ({ applianceId: a.id, priority: a.priority }));
      const updated = await api.essentialLoad.setPriorities(projectId, updates);
      setProfile(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save priorities.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready || loading) return <div className="p-12"><Spinner /></div>;

  return (
    <Shell nav={projectNav(projectId)} title="Essential Load Selector" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <p className="mb-4 text-sm text-black/50 dark:text-white/50">
        Mark which appliances must keep running during an outage. Your backup system can then be sized around the
        essential load instead of the full home.
      </p>

      {profile && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Essential Load" value={formatWatts(profile.essentialRunningW)} tone="good" />
          <StatCard label="Full Home Load" value={formatWatts(profile.fullHomeRunningW)} />
          <StatCard label="Essential Peak" value={formatWatts(profile.essentialPeakW)} />
          <StatCard label="Coverage of Full Home" value={formatPct((profile.essentialRunningW / (profile.fullHomeRunningW || 1)) * 100)} />
        </div>
      )}

      <div className="card divide-y divide-[rgb(var(--border))]">
        {appliances.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm font-medium">
                {a.quantity} × {a.name}
              </div>
              <div className="text-xs text-black/40 dark:text-white/40">{formatWatts(a.ratedWatts * a.quantity)}</div>
            </div>
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(a.id, p)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    a.priority === p
                      ? "bg-brand-600 text-white"
                      : "bg-black/5 text-black/60 hover:bg-black/10 dark:bg-white/10 dark:text-white/60"
                  }`}
                >
                  {p[0] + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="btn-primary mt-4" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save & Recalculate"}
      </button>
    </Shell>
  );
}
