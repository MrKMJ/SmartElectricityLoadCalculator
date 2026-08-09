"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Shell } from "@/components/Shell";
import { Badge, ErrorBanner, Spinner } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatWatts } from "@/lib/format";

export default function SchedulePage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const projectId = params.id;

  const [data, setData] = useState<any>(null);
  const [edits, setEdits] = useState<Record<string, { startTime: string; endTime: string }>>({});
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  async function load() {
    try {
      const result = await api.schedules.get(projectId);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load schedule.");
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function fieldsFor(applianceId: string, item: any) {
    return edits[applianceId] ?? { startTime: item.startTime ?? "00:00", endTime: item.endTime ?? "06:00" };
  }

  function setField(applianceId: string, item: any, key: "startTime" | "endTime", value: string) {
    setEdits((prev) => ({ ...prev, [applianceId]: { ...fieldsFor(applianceId, item), [key]: value } }));
  }

  async function save(applianceId: string, item: any) {
    setError(null);
    try {
      const values = fieldsFor(applianceId, item);
      const result = await api.schedules.upsertItem(projectId, applianceId, values);
      setData(result);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[applianceId];
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save schedule slot.");
    }
  }

  async function runOptimize() {
    setOptimizing(true);
    setError(null);
    try {
      const res = await api.schedules.optimize(projectId);
      setSuggestions(res.suggestions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Optimization failed.");
    } finally {
      setOptimizing(false);
    }
  }

  async function applySuggestion(applianceId: string, suggestedStartHour: number) {
    const result = await api.schedules.applySuggestion(projectId, applianceId, suggestedStartHour);
    setData(result);
    setSuggestions((prev) => prev?.filter((s) => s.applianceId !== applianceId) ?? null);
  }

  if (!ready || !data) return <div className="p-12"><Spinner /></div>;

  const chartData = data.timeline.map((p: any) => ({ time: p.time, Running: p.runningWatts, Surge: p.surgeWatts }));

  return (
    <Shell nav={projectNav(projectId)} title="Load Schedule" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <p className="mb-4 text-sm text-black/50 dark:text-white/50">
        Assign a time window to each appliance. The chart below highlights your daily peak — shift high-power
        appliances away from it to lower your inverter/generator requirement.
      </p>

      <div className="card mb-6 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">24-Hour Load Chart</h3>
          <Badge tone="warn">Peak {formatWatts(data.peakSurgeWatts)} at {data.peakTime}</Badge>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="sched-surge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sched-running" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#18813f" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#18813f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="time" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Area type="monotone" dataKey="Surge" stroke="#f59e0b" fill="url(#sched-surge)" />
            <Area type="monotone" dataKey="Running" stroke="#18813f" fill="url(#sched-running)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-6 flex justify-end">
        <button className="btn-primary" onClick={runOptimize} disabled={optimizing}>
          {optimizing ? "Analyzing…" : "✨ Suggest Optimizations"}
        </button>
      </div>

      {suggestions && (
        <div className="card mb-6 divide-y divide-[rgb(var(--border))]">
          {suggestions.length === 0 ? (
            <div className="p-4 text-sm text-emerald-600">✓ No obvious schedule improvements found.</div>
          ) : (
            suggestions.map((s) => (
              <div key={s.applianceId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="text-sm">{s.message}</div>
                <button
                  className="btn-secondary shrink-0 !px-3 !py-1 text-xs"
                  onClick={() => applySuggestion(s.applianceId, s.suggestedStartHour)}
                >
                  Apply
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="card divide-y divide-[rgb(var(--border))]">
        {data.items.map((item: any) => {
          const values = fieldsFor(item.projectApplianceId, item);
          const dirty = !!edits[item.projectApplianceId];
          return (
            <div key={item.projectApplianceId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm font-medium">
                  {item.quantity} × {item.name}
                </div>
                <div className="text-xs text-black/40 dark:text-white/40">{formatWatts(item.ratedWatts * item.quantity)}</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className="input !w-32 !py-1"
                  value={values.startTime}
                  onChange={(e) => setField(item.projectApplianceId, item, "startTime", e.target.value)}
                />
                <span className="text-xs text-black/40">to</span>
                <input
                  type="time"
                  className="input !w-32 !py-1"
                  value={values.endTime}
                  onChange={(e) => setField(item.projectApplianceId, item, "endTime", e.target.value)}
                />
                {dirty && (
                  <button className="btn-primary !px-3 !py-1 text-xs" onClick={() => save(item.projectApplianceId, item)}>
                    Save
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
