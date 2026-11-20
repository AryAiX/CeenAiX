import type { LabOrderStatus } from '../types';
import { labResultSeverity } from './lab-severity';

/**
 * QA-180: lab results on the doctor dashboard use the same "critical" rule as Lab Referrals
 * (QA-142): critical = flagged HH / LL or marked critical by the lab; any other out-of-range value
 * is "abnormal"; normal results are left out. The dashboard used to call every abnormal value
 * "CRITICAL HIGH" and kept alarming after the doctor had reviewed the order.
 */
export interface DashboardLabItemRow {
  id: string;
  lab_order_id: string;
  test_name: string;
  result_value: string | null;
  result_unit: string | null;
  reference_range: string | null;
  is_abnormal: boolean | null;
  resulted_at: string | null;
  numeric_value: number | null;
  flag: string | null;
  status_category: string | null;
}

export interface DashboardLabResult {
  id: string;
  labOrderId: string;
  patientId: string;
  patientName: string;
  testName: string;
  resultValue: string | null;
  resultUnit: string | null;
  referenceRange: string | null;
  resultedAt: string;
  labOrderStatus: LabOrderStatus;
  severity: 'critical' | 'abnormal';
  /** From the lab's flag: H / HH = high, L / LL = low, null when the lab gave no direction. */
  direction: 'high' | 'low' | null;
}

export function toDashboardLabResults(
  items: DashboardLabItemRow[],
  labOrderById: Map<string, { patient_id: string; status: LabOrderStatus }>,
  patientName: (patientId: string) => string
): DashboardLabResult[] {
  return items.flatMap((item) => {
    if (!item.resulted_at) return [];
    const severity = labResultSeverity(item as unknown as Parameters<typeof labResultSeverity>[0]);
    if (severity !== 'critical' && severity !== 'abnormal') return [];
    const labOrder = labOrderById.get(item.lab_order_id);
    const patientId = labOrder?.patient_id ?? '';
    const flag = (item.flag ?? '').toUpperCase();
    const direction: DashboardLabResult['direction'] =
      flag === 'H' || flag === 'HH' ? 'high' : flag === 'L' || flag === 'LL' ? 'low' : null;

    return [
      {
        id: item.id,
        labOrderId: item.lab_order_id,
        patientId,
        patientName: patientName(patientId),
        testName: item.test_name,
        resultValue: item.result_value ?? (item.numeric_value != null ? String(item.numeric_value) : null),
        resultUnit: item.result_unit,
        referenceRange: item.reference_range,
        resultedAt: item.resulted_at,
        labOrderStatus: labOrder?.status ?? 'reviewed',
        severity,
        direction,
      },
    ];
  });
}

/** Critical results the doctor has not reviewed yet (the red banner), newest first, at most 3. */
export const pickCriticalResults = (results: DashboardLabResult[]): DashboardLabResult[] =>
  results.filter((result) => result.severity === 'critical' && result.labOrderStatus !== 'reviewed').slice(0, 3);
