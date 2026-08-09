"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { ErrorBanner, Spinner } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { globalNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";

export default function BrandingSettingsPage() {
  const { user, ready } = useRequireAuth();
  const [companyName, setCompanyName] = useState("");
  const [brandColorHex, setBrandColorHex] = useState("#18813f");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.auth
      .me()
      .then((me) => {
        setCompanyName(me.preference?.companyName ?? "");
        setBrandColorHex(me.preference?.brandColorHex ?? "#18813f");
        setLogoDataUrl(me.preference?.logoDataUrl ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load branding."))
      .finally(() => setLoading(false));
  }, [ready]);

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 150_000) {
      setError("Logo must be under 150KB — resize/compress it first.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.users.updatePreferences({
        companyName: companyName || undefined,
        brandColorHex,
        logoDataUrl: logoDataUrl || undefined,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save branding.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !user || loading) return <div className="p-12"><Spinner /></div>;

  return (
    <Shell nav={globalNav(user.role)} title="Branding">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {saved && <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Saved.</div>}

      <p className="mb-6 max-w-xl text-sm text-black/50 dark:text-white/50">
        This company name, color, and logo appear on quotation PDFs you generate for client projects — useful if
        you're an installer or professional preparing proposals.
      </p>

      <form onSubmit={save} className="card max-w-xl space-y-4 p-6">
        <div>
          <label className="label">Company name</label>
          <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Solar & Electric" />
        </div>
        <div>
          <label className="label">Brand color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={brandColorHex} onChange={(e) => setBrandColorHex(e.target.value)} className="h-10 w-14 rounded border border-[rgb(var(--border))] bg-transparent" />
            <span className="text-sm text-black/50 dark:text-white/50">{brandColorHex}</span>
          </div>
        </div>
        <div>
          <label className="label">Logo (PNG/JPEG/SVG, under 150KB)</label>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoFile} className="text-sm" />
          {logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUrl} alt="Logo preview" className="mt-3 h-16 rounded border border-[rgb(var(--border))] bg-white p-2" />
          )}
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save branding"}
        </button>
      </form>
    </Shell>
  );
}
