import type { TFunction } from 'i18next';
import type { LabOrderItem } from '../types';

/**
 * How one lab result is shown in the downloaded PDF and the "Copy text" summary (QA-069).
 *
 * A result with no value never gets a normal/abnormal verdict: the database marks every
 * result "normal" until the lab sets a category, so a test still waiting for its result
 * used to print as NORMAL in green.
 */
export type LabReportTone = 'normal' | 'abnormal' | 'pending' | 'none';

export interface LabReportItemSummary {
  value: string;
  status: string;
  tone: LabReportTone;
}

const ABNORMAL_CATEGORIES = new Set(['borderline', 'high', 'elevated', 'low', 'critical']);

const CATEGORY_KEYS: Record<string, string> = {
  normal: 'statusNormal',
  borderline: 'statusBorderline',
  high: 'statusHigh',
  elevated: 'statusHigh',
  low: 'statusLow',
  critical: 'statusCritical',
};

export function hasLabResultValue(item: Pick<LabOrderItem, 'numeric_value' | 'result_value'>): boolean {
  return item.numeric_value != null || (item.result_value != null && item.result_value.trim() !== '');
}

export function summarizeLabItemForReport(
  item: Pick<
    LabOrderItem,
    'numeric_value' | 'result_value' | 'result_unit' | 'status' | 'status_category' | 'status_label' | 'is_abnormal'
  >,
  t: TFunction,
  language: string
): LabReportItemSummary {
  const key = (name: string) => t(`patient.labResults.pdf.${name}`);

  if (!hasLabResultValue(item)) {
    const done = item.status === 'resulted' || item.status === 'reviewed';
    return done
      ? { value: key('noValue'), status: '', tone: 'none' }
      : { value: '', status: key('statusPending'), tone: 'pending' };
  }

  const raw = item.numeric_value != null ? String(item.numeric_value) : (item.result_value ?? '').trim();
  const value = item.result_unit ? `${raw} ${item.result_unit}` : raw;
  const category = String(item.status_category);
  if (category === 'pending') return { value, status: key('statusPending'), tone: 'pending' };
  const abnormal = item.is_abnormal === true || ABNORMAL_CATEGORIES.has(category);
  const translated = key(CATEGORY_KEYS[category] ?? (abnormal ? 'statusAbnormal' : 'statusNormal'));
  // The lab's own label (for example "Prediabetic range") is English text, so Arabic uses the translated category.
  const status = language.toLowerCase().startsWith('ar') ? translated : (item.status_label ?? translated);
  return { value, status, tone: abnormal ? 'abnormal' : 'normal' };
}
