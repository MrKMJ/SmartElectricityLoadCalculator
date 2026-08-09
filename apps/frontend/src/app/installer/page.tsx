"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Badge, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { globalNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatKwh, formatWatts } from "@/lib/format";

const RELATIONSHIP_TONE: Record<string, "good" | "default"> = { OWNER: "good", ADMIN: "default", EDITOR: "default", VIEWER: "default" };

export default function InstallerDashboardPage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const [clients, setClients] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    api.installer
      .clients()
      .then(setClients)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load clients."));
  }, [ready]);

  if (!ready || !user) return null;

  const owned = clients?.filter((c) => c.relationship === "OWNER") ?? [];
  const shared = clients?.filter((c) => c.relationship !== "OWNER") ?? [];

  return (
    <Shell nav={globalNav(user.role)} title="Installer Dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <p className="mb-6 text-sm text-black/50 dark:text-white/50">
        A cross-property view of every project you own or have been given access to — useful for installers and
        professionals managing multiple clients.
      </p>

      {clients === null ? (
        <Spinner />
      ) : clients.length === 0 ? (
        <EmptyState title="No projects yet" description="Create a property or ask a client to invite you to theirs." />
      ) : (
        <>
          {shared.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                Client Projects
              </h3>
              <ClientTable rows={shared} onOpen={(id) => router.push(`/projects/${id}`)} />
            </div>
          )}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
              My Own Properties
            </h3>
            <ClientTable rows={owned} onOpen={(id) => router.push(`/projects/${id}`)} />
          </div>
        </>
      )}
    </Shell>
  );
}

function ClientTable({ rows, onOpen }: { rows: any[]; onOpen: (id: string) => void }) {
  if (rows.length === 0) return <div className="card p-4 text-sm text-black/50 dark:text-white/50">None yet.</div>;
  return (
    <div className="card divide-y divide-[rgb(var(--border))]">
      {rows.map((c) => (
        <button key={c.id} onClick={() => onOpen(c.id)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              {c.name}
              <Badge tone={RELATIONSHIP_TONE[c.relationship] ?? "default"}>{c.relationship}</Badge>
            </div>
            <div className="text-xs text-black/40 dark:text-white/40">
              {c.owner.name} · {c.owner.email} · {c.applianceCount} appliances
            </div>
          </div>
          <div className="text-right text-xs text-black/50 dark:text-white/50">
            {c.latestCalculation ? (
              <>
                <div>{formatWatts(c.latestCalculation.peakWatts)} peak</div>
                <div>
                  {formatKwh(c.latestCalculation.monthlyKwh)}/mo · {formatCurrency(c.latestCalculation.estimatedBill)}
                </div>
              </>
            ) : (
              <div>No calculation yet</div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
