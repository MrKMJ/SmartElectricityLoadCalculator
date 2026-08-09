"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Badge, EmptyState, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { globalNav } from "@/lib/nav";

const SEVERITY_TONE: Record<string, "default" | "warn" | "bad"> = {
  OVERLOAD: "bad",
  SURGE_WARNING: "bad",
  SYSTEM_UNDERSIZED: "bad",
  BATTERY_WARNING: "warn",
  HIGH_CONSUMPTION: "warn",
  PEAK_LOAD: "warn",
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) api.notifications.list().then(setItems);
  }, [user]);

  async function markAllRead() {
    await api.notifications.markAllRead();
    setItems((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
  }

  async function markRead(id: string) {
    await api.notifications.markRead(id);
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? null);
  }

  if (authLoading || !user) return null;

  return (
    <Shell nav={globalNav(user.role)} title="Notifications">
      <div className="mb-4 flex justify-end">
        <button className="btn-secondary" onClick={markAllRead}>
          Mark all read
        </button>
      </div>
      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up." />
      ) : (
        <div className="card divide-y divide-[rgb(var(--border))]">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
                  {n.title}
                  <Badge tone={SEVERITY_TONE[n.type] ?? "default"}>{n.type.replace(/_/g, " ")}</Badge>
                </div>
                <div className="mt-1 text-sm text-black/60 dark:text-white/60">{n.message}</div>
              </div>
              <div className="shrink-0 text-xs text-black/40 dark:text-white/40">
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}
