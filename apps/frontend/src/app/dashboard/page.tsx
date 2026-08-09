"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { globalNav } from "@/lib/nav";

const PROJECT_TYPES = ["RESIDENTIAL", "OFFICE", "SHOP", "FARM", "RENTAL", "OTHER"];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("RESIDENTIAL");
  const [currency, setCurrency] = useState("USD");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    api.projects
      .list()
      .then(setProjects)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load projects."));
  }, [user]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const project = await api.projects.create({ name, type, currency });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create project.");
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || !user) return null;

  return (
    <Shell nav={globalNav(user.role)} title="Your projects">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-black/50 dark:text-white/50">
          A project represents one property — home, office, shop, or farm.
        </p>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          + Add Property
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {showCreate && (
        <form onSubmit={createProject} className="card mb-6 grid gap-4 p-5 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="My Home" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0] + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      )}

      {projects === null ? (
        <Spinner />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add your first property to start building an appliance inventory and sizing your backup system."
          action={
            <button className="btn-primary mt-2" onClick={() => setShowCreate(true)}>
              + Add Property
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              className="card p-5 text-left transition-shadow hover:shadow-md"
            >
              <div className="text-base font-semibold">{p.name}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-black/40 dark:text-white/40">{p.type}</div>
              <div className="mt-3 text-sm text-black/50 dark:text-white/50">
                {p._count?.appliances ?? 0} appliance{p._count?.appliances === 1 ? "" : "s"}
              </div>
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}
