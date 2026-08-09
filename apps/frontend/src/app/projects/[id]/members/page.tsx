"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Badge, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";

const ROLES = ["VIEWER", "EDITOR", "ADMIN"];

export default function MembersPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const projectId = params.id;

  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  async function load() {
    try {
      const [proj, list] = await Promise.all([api.projects.get(projectId), api.projects.members(projectId)]);
      setProject(proj);
      setMembers(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load members.");
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);
    try {
      await api.projects.addMember(projectId, { email, role });
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to invite member. Make sure they already have an account.");
    } finally {
      setInviting(false);
    }
  }

  async function updateRole(memberId: string, newRole: string) {
    await api.projects.updateMember(projectId, memberId, newRole);
    await load();
  }

  async function remove(memberId: string) {
    if (!confirm("Remove this member from the project?")) return;
    await api.projects.removeMember(projectId, memberId);
    await load();
  }

  if (!ready || !project) return <div className="p-12"><Spinner /></div>;

  return (
    <Shell nav={projectNav(projectId)} title="Project Members" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <p className="mb-4 text-sm text-black/50 dark:text-white/50">
        Share <strong>{project.name}</strong> with installers, family, or colleagues. They must already have an
        account with the email below.
      </p>

      <form onSubmit={invite} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
          />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r[0] + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={inviting}>
          {inviting ? "Inviting…" : "+ Invite"}
        </button>
      </form>

      {members === null ? (
        <Spinner />
      ) : members.length === 0 ? (
        <EmptyState title="No members yet" description="Invite someone above to give them access to this project." />
      ) : (
        <div className="card divide-y divide-[rgb(var(--border))]">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium">{m.user?.name}</div>
                <div className="text-xs text-black/40 dark:text-white/40">{m.user?.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="input !w-32 !py-1 text-xs"
                  value={m.role}
                  onChange={(e) => updateRole(m.id, e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r[0] + r.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
                <Badge>{m.role}</Badge>
                <button className="text-xs text-red-600" onClick={() => remove(m.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
