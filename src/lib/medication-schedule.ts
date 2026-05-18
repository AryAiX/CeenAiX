/**
 * Heuristics for free-text frequency — until structured coding + adherence exist in DB.
 */

export function estimateDosesPerDay(frequency: string | null | undefined): number | null {
  if (!frequency) return null;
  const f = frequency.toLowerCase();
  if (/(four|4\s*x|4x|qid|q\.?i\.?d\.?|four times)/i.test(f)) return 4;
  if (/(three|3\s*x|3x|tid|t\.?i\.?d\.?|thrice)/i.test(f)) return 3;
  if (/(twice|2\s*x|2x|bid|b\.?i\.?d\.?|two times)/i.test(f)) return 2;
  // Explicit interval expressions like "every 4 hours" → derive dose count.
  const everyN = /every\s+(\d+(?:\.\d+)?)\s*(h|hr|hours?)/i.exec(f);
  if (everyN) {
    const hours = Number.parseFloat(everyN[1]);
    if (Number.isFinite(hours) && hours > 0) {
      return Math.max(1, Math.round(24 / hours));
    }
  }
  if (/q\.?\s*(\d+)\s*h/.test(f)) {
    const match = /q\.?\s*(\d+)\s*h/.exec(f);
    const hours = match ? Number.parseInt(match[1], 10) : NaN;
    if (Number.isFinite(hours) && hours > 0) {
      return Math.max(1, Math.round(24 / hours));
    }
  }
  if (/(once|1\s*x|1x|q\.?d|o\.?d|daily|every day|per day|nocte|nightly)/i.test(f)) return 1;
  if (/(as needed|prn|sos|when required)/i.test(f)) return 1;
  if (/(every other day|alternate days?|qod|q\.o\.d\.)/i.test(f)) return 0.5;
  if (/(weekly|every week|qweek|q\.?w)/i.test(f)) return 1 / 7;
  if (/(monthly|every month|qmonth|q\.?m)/i.test(f)) return 1 / 30;
  // Unknown frequency string — do not silently assume 1/day. Callers must
  // treat null as "do not estimate" (e.g. show "—" rather than fake days).
  return null;
}

/** Estimated calendar days of supply from quantity (units) ÷ doses per day, when both exist. */
export function estimateDaysOfSupplyRemaining(
  quantity: number | null | undefined,
  frequency: string | null | undefined
): number | null {
  if (quantity == null || quantity <= 0) return null;
  const perDay = estimateDosesPerDay(frequency);
  if (perDay === null || perDay <= 0) return null;
  return Math.max(0, Math.floor(quantity / perDay));
}

export function supplyBarPercent(daysRemaining: number | null, quantity: number | null, horizonDays = 30): number {
  if (daysRemaining != null) {
    return Math.min(100, Math.max(0, (daysRemaining / horizonDays) * 100));
  }
  if (quantity != null && quantity > 0) {
    return Math.min(100, Math.max(0, (quantity / 60) * 100));
  }
  return 50;
}

export type RefillUrgency = 'emerald' | 'amber' | 'red';

export function urgencyFromDaysRemaining(
  daysRemaining: number | null,
  quantity: number | null
): RefillUrgency {
  if (daysRemaining != null) {
    if (daysRemaining > 14) return 'emerald';
    if (daysRemaining >= 7) return 'amber';
    return 'red';
  }
  if (quantity == null) return 'emerald';
  if (quantity > 14) return 'emerald';
  if (quantity > 6) return 'amber';
  return 'red';
}

export function isRefillDueSoon(
  daysRemaining: number | null,
  quantity: number | null,
  soonDays = 14
): boolean {
  if (daysRemaining != null) {
    return daysRemaining <= soonDays;
  }
  if (quantity != null) {
    return quantity <= 30;
  }
  return false;
}

export function isUrgentRefill(
  daysRemaining: number | null,
  quantity: number | null,
  urgentDays = 7
): boolean {
  if (daysRemaining != null) {
    return daysRemaining < urgentDays;
  }
  if (quantity != null) {
    return quantity < urgentDays;
  }
  return false;
}
