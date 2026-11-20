import type { LabOrderItem } from '../types';
import { hasLabResultValue, labItemDisplayStatus } from './lab-report-item';

/**
 * QA-142: how serious one lab result is, for the doctor's Lab Referrals page.
 *
 * "Critical" follows the same rule as the lab portal (use-lab-ops-portal): the lab marked the
 * result critical (status_category = 'critical') or flagged it critically high or low (HH / LL).
 * Any other out-of-range result is "abnormal". The page used to call every abnormal result
 * critical, so a slightly high value raised the same pulsing alarm as a dangerous one.
 */
export type LabResultSeverity = 'critical' | 'abnormal' | 'normal' | 'pending';

type SeverityFields = Pick<LabOrderItem, 'numeric_value' | 'result_value' | 'status_category' | 'is_abnormal' | 'flag'>;

const ABNORMAL_DISPLAY = new Set(['borderline', 'high', 'low', 'abnormal']);

export function labResultSeverity(item: SeverityFields): LabResultSeverity {
  if (!hasLabResultValue(item)) return 'pending';
  if (item.flag === 'HH' || item.flag === 'LL') return 'critical';
  const display = labItemDisplayStatus(item);
  if (display === 'critical') return 'critical';
  if (item.is_abnormal === true || item.flag === 'H' || item.flag === 'L' || ABNORMAL_DISPLAY.has(display)) {
    return 'abnormal';
  }
  return 'normal';
}

export const isCriticalLabItem = (item: SeverityFields): boolean => labResultSeverity(item) === 'critical';

/**
 * An order still needs the doctor's attention for a critical result: it has one, and the doctor
 * has not marked the order reviewed yet. Once reviewed, the alarm stops.
 */
export function needsCriticalReview(order: { status: string; items: SeverityFields[] }): boolean {
  return order.status !== 'reviewed' && order.items.some(isCriticalLabItem);
}

/** The result as stored: the text value if there is one, otherwise the number. */
export function labResultValueText(item: Pick<LabOrderItem, 'numeric_value' | 'result_value' | 'result_unit'>): string {
  const raw = item.result_value?.trim() || (item.numeric_value != null ? String(item.numeric_value) : '');
  return [raw, item.result_unit].filter(Boolean).join(' ');
}
