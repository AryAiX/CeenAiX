import { describe, expect, it } from 'vitest';
import { compareStockAlerts } from './stock-alerts';

describe('compareStockAlerts', () => {
  it('orders alerts by clinical severity (out → low → near_expiry)', () => {
    const input = [
      { severity: 'near_expiry', quantity: 4 },
      { severity: 'low', quantity: 10 },
      { severity: 'out', quantity: 0 },
    ];
    const sorted = [...input].sort(compareStockAlerts);
    expect(sorted.map((row) => row.severity)).toEqual(['out', 'low', 'near_expiry']);
  });

  it('breaks ties on remaining stock ascending', () => {
    const input = [
      { severity: 'low', quantity: 30 },
      { severity: 'low', quantity: 5 },
      { severity: 'low', quantity: 12 },
    ];
    const sorted = [...input].sort(compareStockAlerts);
    expect(sorted.map((row) => row.quantity)).toEqual([5, 12, 30]);
  });

  it('places unknown severities at the bottom rather than crashing', () => {
    const input = [
      { severity: 'unknown', quantity: 1 },
      { severity: 'out', quantity: 0 },
    ];
    const sorted = [...input].sort(compareStockAlerts);
    expect(sorted[0]?.severity).toBe('out');
    expect(sorted[1]?.severity).toBe('unknown');
  });
});
