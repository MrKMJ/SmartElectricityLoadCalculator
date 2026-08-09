"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner } from "@/components/ui";
import { useRequireAdmin } from "@/lib/hooks";
import { adminNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";

const ROLES = ["USER", "PROFESSIONAL", "INSTALLER", "ADMIN", "SUPER_ADMIN"];
const STATUSES = ["ACTIVE", "SUSPENDED", "DELETED"];

export default function AdminUsersPage() {
  const { ready } = useRequireAdmin();
  const [users, setUsers] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setUsers(await api.admin.users());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function updateRole(id: string, role: string) {
    await api.admin.updateUser(id, { role });
    await load();
  }

  async function updateStatus(id: string, status: string) {
    await api.admin.updateUser(id, { status });
    await load();
  }

  if (!ready) return null;

  return (
    <Shell nav={adminNav()} title="Users">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {users === null ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))] text-left text-xs uppercase text-black/40 dark:text-white/40">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[rgb(var(--border))] last:border-0">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2 text-black/60 dark:text-white/60">{u.email}</td>
                  <td className="px-4 py-2">
                    <select className="input !w-36 !py-1" value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select className="input !w-32 !py-1" value={u.status} onChange={(e) => updateStatus(u.id, e.target.value)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-black/40 dark:text-white/40">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
