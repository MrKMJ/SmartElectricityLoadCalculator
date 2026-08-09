// Bump ENGINE_VERSION whenever formula *code* changes shape (new fields, new
// algorithm). Bump FORMULA_VERSION whenever a numeric constant/assumption
// changes. Every stored calculation snapshots both — see Architecture.docx
// section "Calculation Versioning": old reports must remain reproducible
// even after formulas evolve.
export const ENGINE_VERSION = "1.0.0";
export const FORMULA_VERSION = "2026-08";

// Sane upper bounds so malformed requests can't produce nonsensical or
// resource-exhausting calculations (Architecture.docx "Validation Layer").
export const LIMITS = {
  MAX_QUANTITY: 1000,
  MAX_WATTS: 500_000,
  MAX_HOURS_PER_DAY: 24,
  MAX_DAYS_PER_MONTH: 31,
  MAX_VOLTAGE: 1000,
  MIN_POWER_FACTOR: 0.1,
  MAX_POWER_FACTOR: 1,
  MAX_SAFETY_MARGIN_PCT: 200,
  MAX_BACKUP_HOURS: 168,
};
