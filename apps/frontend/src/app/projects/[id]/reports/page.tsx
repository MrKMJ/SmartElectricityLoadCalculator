"use client";

import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Badge, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks";
import { projectNav } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";

const STATUS_TONE: Record<string, "default" | "good" | "warn" | "bad"> = {
  QUEUED: "default",
  PROCESSING: "warn",
  COMPLETED: "good",
  FAILED: "bad",
};

interface LineItem {
  label: string;
  description: string;
  unitCost: number;
  quantity: number;
}

const emptyLineItem: LineItem = { label: "", description: "", unitCost: 0, quantity: 1 };

export default function ReportsPage({ params }: { params: { id: string } }) {
  const { ready } = useRequireAuth();
  const projectId = params.id;

  const [reports, setReports] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...emptyLineItem }]);
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      setReports(await api.reports.list(projectId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load reports.");
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    // Poll while any report is still queued/processing (the PDF worker runs
    // asynchronously — see Architecture.docx §35 Report Workflow).
    const hasPending = reports?.some((r) => r.status === "QUEUED" || r.status === "PROCESSING");
    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(load, 3000);
    } else if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      await api.reports.create(projectId, "PROJECT_SUMMARY");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to queue report.");
    } finally {
      setGenerating(false);
    }
  }

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addLine() {
    setLineItems((prev) => [...prev, { ...emptyLineItem }]);
  }

  function removeLine(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function generateQuote() {
    setGeneratingQuote(true);
    setError(null);
    try {
      const items = lineItems.filter((i) => i.label.trim().length > 0);
      await api.reports.create(projectId, "QUOTATION", items);
      setShowQuoteBuilder(false);
      setLineItems([{ ...emptyLineItem }]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to queue quotation.");
    } finally {
      setGeneratingQuote(false);
    }
  }

  async function download(id: string) {
    try {
      const { url } = await api.reports.download(id);
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Report is not ready yet.");
    }
  }

  const total = lineItems.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);

  if (!ready) return null;

  return (
    <Shell nav={projectNav(projectId)} title="Reports" backHref="/dashboard">
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mb-6 flex flex-wrap justify-end gap-2">
        <button className="btn-secondary" onClick={() => setShowQuoteBuilder((v) => !v)}>
          🧾 Build Quotation
        </button>
        <button className="btn-primary" onClick={generate} disabled={generating}>
          {generating ? "Queuing…" : "📄 Generate Report"}
        </button>
      </div>

      {showQuoteBuilder && (
        <div className="card mb-6 space-y-3 p-5">
          <h3 className="text-sm font-semibold">Quotation Line Items</h3>
          <p className="text-xs text-black/50 dark:text-white/50">
            Uses your saved company branding (Branding settings) and the project's system-sizing recommendations.
          </p>
          {lineItems.map((item, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-12 sm:items-center">
              <input
                className="input sm:col-span-4"
                placeholder="e.g. 5kW Inverter"
                value={item.label}
                onChange={(e) => updateLine(i, { label: e.target.value })}
              />
              <input
                className="input sm:col-span-4"
                placeholder="Description (optional)"
                value={item.description}
                onChange={(e) => updateLine(i, { description: e.target.value })}
              />
              <input
                type="number"
                className="input sm:col-span-2"
                placeholder="Unit cost"
                value={item.unitCost}
                onChange={(e) => updateLine(i, { unitCost: Number(e.target.value) })}
              />
              <input
                type="number"
                className="input sm:col-span-1"
                placeholder="Qty"
                min={1}
                value={item.quantity}
                onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
              />
              <button className="text-xs text-red-600 sm:col-span-1" onClick={() => removeLine(i)}>
                Remove
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-[rgb(var(--border))] pt-3">
            <button className="btn-secondary !px-3 !py-1 text-xs" onClick={addLine}>
              + Add line
            </button>
            <div className="text-sm font-medium">Total: {total.toFixed(2)}</div>
          </div>
          <button className="btn-primary" onClick={generateQuote} disabled={generatingQuote}>
            {generatingQuote ? "Queuing…" : "Generate Quotation PDF"}
          </button>
        </div>
      )}

      {reports === null ? (
        <Spinner />
      ) : reports.length === 0 ? (
        <EmptyState title="No reports yet" description="Generate a PDF summary of your load, sizing, and recommendations." />
      ) : (
        <div className="card divide-y divide-[rgb(var(--border))]">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium">{r.type.replace(/_/g, " ")}</div>
                <div className="text-xs text-black/40 dark:text-white/40">{new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                {r.status === "COMPLETED" && (
                  <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => download(r.id)}>
                    Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
