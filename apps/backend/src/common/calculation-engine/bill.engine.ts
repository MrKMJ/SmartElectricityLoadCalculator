import { round } from "./load.engine";

export interface TariffSlabInput {
  minKwh: number;
  maxKwh: number | null; // null = unbounded top slab
  ratePerKwh: number;
  fixedCharge: number;
  taxRatePct: number;
}

export interface BillResult {
  inputKwh: number;
  energyCharge: number;
  fixedCharges: number;
  taxes: number;
  calculatedAmount: number;
  slabBreakdown: Array<{ minKwh: number; maxKwh: number | null; kwhInSlab: number; rate: number; charge: number }>;
}

/**
 * Electricity Bill Engine (Architecture.docx §15/§34).
 * Applies progressive slab/tier pricing: consumption is split across the
 * slabs it spans, each portion billed at that slab's rate, then a single
 * fixed charge and tax percentage are applied on top.
 */
export function calculateBill(monthlyKwh: number, slabs: TariffSlabInput[]): BillResult {
  const sorted = [...slabs].sort((a, b) => a.minKwh - b.minKwh);

  let remaining = monthlyKwh;
  let energyCharge = 0;
  const slabBreakdown: BillResult["slabBreakdown"] = [];

  for (const slab of sorted) {
    if (remaining <= 0) break;
    const slabWidth = slab.maxKwh != null ? slab.maxKwh - slab.minKwh : remaining;
    const kwhInSlab = Math.min(remaining, Math.max(0, slabWidth));
    if (kwhInSlab <= 0) continue;

    const charge = kwhInSlab * slab.ratePerKwh;
    energyCharge += charge;
    remaining -= kwhInSlab;

    slabBreakdown.push({
      minKwh: slab.minKwh,
      maxKwh: slab.maxKwh,
      kwhInSlab: round(kwhInSlab),
      rate: slab.ratePerKwh,
      charge: round(charge),
    });
  }

  // Fixed charge & tax rate: use the slab the consumption ultimately falls
  // into (highest slab reached), matching typical utility billing.
  const applicableSlab = slabBreakdown[slabBreakdown.length - 1] ?? sorted[0];
  const fixedCharges = applicableSlab
    ? sorted.find((s) => s.minKwh === applicableSlab.minKwh)?.fixedCharge ?? 0
    : 0;
  const taxRatePct = applicableSlab
    ? sorted.find((s) => s.minKwh === applicableSlab.minKwh)?.taxRatePct ?? 0
    : 0;

  const taxes = round((energyCharge + fixedCharges) * (taxRatePct / 100));
  const calculatedAmount = round(energyCharge + fixedCharges + taxes);

  return {
    inputKwh: monthlyKwh,
    energyCharge: round(energyCharge),
    fixedCharges: round(fixedCharges),
    taxes,
    calculatedAmount,
    slabBreakdown,
  };
}
