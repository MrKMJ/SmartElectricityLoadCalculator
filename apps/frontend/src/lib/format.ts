export function formatWatts(w?: number | null): string {
  if (w == null) return "—";
  return w >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${Math.round(w)} W`;
}

export function formatKwh(k?: number | null, unit = "kWh"): string {
  if (k == null) return "—";
  return `${k.toFixed(2)} ${unit}`;
}

export function formatCurrency(amount?: number | null, currency = "USD"): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatPct(p?: number | null): string {
  if (p == null) return "—";
  return `${p.toFixed(1)}%`;
}
