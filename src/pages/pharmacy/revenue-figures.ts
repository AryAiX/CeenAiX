import type { PharmacyClaimLedgerItem } from '../../hooks';
import { clinicDateKey } from '../../lib/clinic-booking-time';

export interface RevenueFigures {
  paidToday: { amount: number; count: number };
  paidThisMonth: { amount: number; count: number; average: number };
  outstanding: { amount: number; count: number; inReview: number };
  denied: { amount: number; count: number };
}

/**
 * QA-279: the Revenue figures, by what they say. Dates are Dubai dates (today, this month).
 *   - Paid today / this month: paid claims by their paid date (a paid claim without a paid date
 *     is not counted in either).
 *   - Outstanding: claims still pending or in review (money not yet received).
 *   - Denied: refused claims (never counted as revenue).
 * The old page added up every paid claim ever as "today", every claim (paid and denied too) as a
 * "projected queue value", and averaged denied claims into the "average Rx value".
 */
export const summarizeRevenue = (
  claims: ReadonlyArray<Pick<PharmacyClaimLedgerItem, 'amountAed' | 'status' | 'paidAt'>>,
  todayKey: string
): RevenueFigures => {
  const monthKey = todayKey.slice(0, 7);
  const figures: RevenueFigures = {
    paidToday: { amount: 0, count: 0 },
    paidThisMonth: { amount: 0, count: 0, average: 0 },
    outstanding: { amount: 0, count: 0, inReview: 0 },
    denied: { amount: 0, count: 0 },
  };
  for (const claim of claims) {
    const amount = Number.isFinite(claim.amountAed) ? claim.amountAed : 0;
    if (claim.status === 'paid') {
      if (!claim.paidAt) continue;
      const paidKey = clinicDateKey(claim.paidAt);
      if (paidKey === todayKey) {
        figures.paidToday.amount += amount;
        figures.paidToday.count += 1;
      }
      if (paidKey.slice(0, 7) === monthKey) {
        figures.paidThisMonth.amount += amount;
        figures.paidThisMonth.count += 1;
      }
    } else if (claim.status === 'pending' || claim.status === 'review') {
      figures.outstanding.amount += amount;
      figures.outstanding.count += 1;
      if (claim.status === 'review') figures.outstanding.inReview += 1;
    } else if (claim.status === 'denied') {
      figures.denied.amount += amount;
      figures.denied.count += 1;
    }
  }
  figures.paidThisMonth.average = figures.paidThisMonth.count
    ? Math.round(figures.paidThisMonth.amount / figures.paidThisMonth.count)
    : 0;
  return figures;
};

export interface PayerRevenue {
  payer: string;
  paid: number;
  outstanding: number;
}

/**
 * QA-280: Revenue By Payer, by money. Paid and outstanding (pending + review) amounts per payer;
 * denied claims are left out (they are not revenue). Payers with only denied claims are not listed.
 * Biggest paid first, then biggest outstanding, then name.
 */
export const summarizeRevenueByPayer = (
  claims: ReadonlyArray<Pick<PharmacyClaimLedgerItem, 'amountAed' | 'status' | 'payerName'>>
): PayerRevenue[] => {
  const byPayer = new Map<string, PayerRevenue>();
  for (const claim of claims) {
    if (claim.status === 'denied') continue;
    const amount = Number.isFinite(claim.amountAed) ? claim.amountAed : 0;
    const entry = byPayer.get(claim.payerName) ?? { payer: claim.payerName, paid: 0, outstanding: 0 };
    if (claim.status === 'paid') entry.paid += amount;
    else entry.outstanding += amount;
    byPayer.set(claim.payerName, entry);
  }
  return Array.from(byPayer.values()).sort(
    (a, b) => b.paid - a.paid || b.outstanding - a.outstanding || a.payer.localeCompare(b.payer)
  );
};
