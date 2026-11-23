/**
 * QA-195: estimated price of a clinic visit.
 *
 * No price is stored on an appointment and nothing is billed yet, so the clinic portal can only
 * estimate it from the clinic's CURRENT fee list for that doctor (facility_staff):
 *   * telemedicine (virtual) visit -> telemedicine_fee, else consultation_fee;
 *   * "Follow-up Visit"            -> follow_up_fee, else consultation_fee;
 *   * anything else                -> consultation_fee.
 * Returns null when no fee is set (shown as "—", never as AED 0). Links that are no longer active
 * still count, so past visits of a doctor who left keep their estimate.
 */
export interface ClinicFeeLink {
  doctor_user_id: string;
  consultation_fee: number | string | null;
  telemedicine_fee?: number | string | null;
  follow_up_fee?: number | string | null;
}

const toFee = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const fee = Number(value);
  return Number.isFinite(fee) && fee >= 0 ? fee : null;
};

export const estimatedVisitFee = (
  link: ClinicFeeLink | undefined,
  visit: { visitType: string; reason: string }
): number | null => {
  if (!link) return null;
  const consultation = toFee(link.consultation_fee);
  if (visit.visitType === 'virtual') return toFee(link.telemedicine_fee) ?? consultation;
  if (visit.reason === 'Follow-up Visit') return toFee(link.follow_up_fee) ?? consultation;
  return consultation;
};

/** Sum of the known estimates; null when none of the visits has a fee set. */
export const sumEstimatedFees = (fees: (number | null)[]): number | null => {
  const known = fees.filter((fee): fee is number => fee !== null);
  if (fees.length > 0 && known.length === 0) return null;
  return known.reduce((total, fee) => total + fee, 0);
};

/** QA-205: largest fee a clinic can set (same limit as facility_staff_fees_range_chk). */
export const MAX_CLINIC_FEE = 100000;

/**
 * QA-205: read a fee typed by clinic staff. Empty means "not set" (null). Otherwise a number from
 * 0 to 100,000 with at most 2 decimals. Number('') used to turn an empty box into AED 0.
 */
export const parseFeeInput = (raw: string): { ok: true; value: number | null } | { ok: false } => {
  const text = raw.trim();
  if (text === '') return { ok: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { ok: false };
  const value = Number(text);
  return value >= 0 && value <= MAX_CLINIC_FEE ? { ok: true, value } : { ok: false };
};
