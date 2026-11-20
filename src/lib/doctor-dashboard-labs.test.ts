import { describe, expect, it } from 'vitest';
import { pickCriticalResults, toDashboardLabResults, type DashboardLabItemRow } from './doctor-dashboard-labs';

const item = (id: string, overrides: Partial<DashboardLabItemRow> = {}): DashboardLabItemRow => ({
  id,
  lab_order_id: 'order-1',
  test_name: 'Potassium',
  result_value: '6.9',
  result_unit: 'mmol/L',
  reference_range: '3.5-5.1',
  is_abnormal: true,
  resulted_at: '2026-11-20T08:00:00Z',
  numeric_value: null,
  flag: null,
  status_category: null,
  ...overrides,
});

const orders = new Map([
  ['order-1', { patient_id: 'p1', status: 'resulted' as const }],
  ['order-2', { patient_id: 'p2', status: 'reviewed' as const }],
]);
const name = (id: string) => (id === 'p1' ? 'Sara Ali' : 'Omar Said');

describe('dashboard lab results (QA-180)', () => {
  it('uses the QA-142 rule: HH / LL / lab-marked critical are critical, other out-of-range values abnormal', () => {
    const results = toDashboardLabResults(
      [
        item('hh', { flag: 'HH' }),
        item('ll', { flag: 'LL', result_value: '2.1' }),
        item('cat', { status_category: 'critical' }),
        item('h', { flag: 'H' }),
        item('abn', { flag: null }),
      ],
      orders,
      name
    );
    expect(results.map((result) => [result.id, result.severity, result.direction])).toEqual([
      ['hh', 'critical', 'high'],
      ['ll', 'critical', 'low'],
      ['cat', 'critical', null],
      ['h', 'abnormal', 'high'],
      ['abn', 'abnormal', null],
    ]);
    expect(results[0].patientName).toBe('Sara Ali');
  });

  it('leaves out normal results and results that are not in yet', () => {
    const results = toDashboardLabResults(
      [item('normal', { is_abnormal: false }), item('pending', { resulted_at: null })],
      orders,
      name
    );
    expect(results).toEqual([]);
  });

  it('uses the number when there is no text value', () => {
    const [result] = toDashboardLabResults([item('n', { result_value: null, numeric_value: 7.2, flag: 'HH' })], orders, name);
    expect(result.resultValue).toBe('7.2');
  });

  it('the banner only shows critical results on orders that are not reviewed yet, at most 3', () => {
    const results = toDashboardLabResults(
      [
        item('a', { flag: 'HH' }),
        item('reviewed', { flag: 'HH', lab_order_id: 'order-2' }),
        item('abnormal', { flag: 'H' }),
        item('b', { flag: 'LL' }),
        item('c', { flag: 'HH' }),
        item('d', { flag: 'HH' }),
      ],
      orders,
      name
    );
    expect(pickCriticalResults(results).map((result) => result.id)).toEqual(['a', 'b', 'c']);
  });
});
