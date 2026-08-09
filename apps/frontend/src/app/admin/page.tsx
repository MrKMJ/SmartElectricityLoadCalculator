"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner, StatCard } from "@/components/ui";
import { useRequireAdmin } from "@/lib/hooks";
import { adminNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";

export default function AdminOverviewPage() {
  const { ready } = useRequireAdmin();
  const [overview, setOverview] = useState<any>(null);
  const [topAppliances, setTopAppliances] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    Promise.all([api.admin.analyticsOverview(), api.admin.analyticsAppliances()])
      .then(([ov, apps]) => {
        setOverview(ov);
        setTopAppliances(apps.mostUsed ?? []);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load analytics."));
  }, [ready]);

  if (!ready) return null;

  return (
    <Shell nav={adminNav()} title="Admin Overview">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {!overview ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Users" value={String(overview.users)} />
            <StatCard label="Projects" value={String(overview.projects)} />
            <StatCard label="Appliances Tracked" value={String(overview.appliances)} />
            <StatCard label="Calculations Run" value={String(overview.calculations)} />
            <StatCard label="Reports Generated" value={String(overview.reports)} />
            <StatCard label="Solar Sizings" value={String(overview.solarCalculations)} />
            <StatCard label="Inverter Sizings" value={String(overview.inverterCalculations)} />
          </div>

          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Most-Used Appliances
          </h3>
          <div className="card divide-y divide-[rgb(var(--border))]">
            {topAppliances.length === 0 ? (
              <div className="p-4 text-sm text-black/50 dark:text-white/50">No data yet.</div>
            ) : (
              topAppliances.map((a) => (
                <div key={a.name} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>{a.name}</span>
                  <span className="text-black/50 dark:text-white/50">{a.count}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
