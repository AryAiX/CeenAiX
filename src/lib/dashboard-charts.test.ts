import { describe, expect, it } from 'vitest';
import { type ChartBox, chartAreaPath, chartPoints, chartY, fitChartDomain } from './dashboard-charts';

const box: ChartBox = { width: 600, height: 150, padLeft: 24, padRight: 64, padTop: 30, padBottom: 30 };

describe('Dashboard charts (QA-010)', () => {
  it('fits the range to the readings and keeps reference values visible', () => {
    expect(fitChartDomain([9.2, 7.6, 7.1], [6.5], 0.5, 0.5)).toEqual([6, 10]);
    expect(fitChartDomain([165, 150, 118, 105, 96, 74], [130, 85], 10, 10)).toEqual([60, 180]);
    expect(fitChartDomain([], [6.5], 0.5, 0.5)).toEqual([6, 7]);
    expect(fitChartDomain([], [], 1, 5)).toEqual([0, 5]);
  });

  it('keeps every reading inside the chart', () => {
    const domain = fitChartDomain([165, 74], [130, 85], 10, 10);
    for (const value of [165, 74, 130, 85]) {
      const y = chartY(value, box, domain);
      expect(y).toBeGreaterThanOrEqual(box.padTop);
      expect(y).toBeLessThanOrEqual(box.height - box.padBottom);
    }
  });

  it('puts systolic above diastolic on the shared scale (128/82 no longer at the same height)', () => {
    const domain = fitChartDomain([128, 82], [130, 85], 10, 10);
    expect(chartY(128, box, domain)).toBeLessThan(chartY(82, box, domain) - 20);
  });

  it('spaces points evenly and centres a single reading', () => {
    expect(chartPoints([1, 2, 3], box, [0, 4]).map((point) => point.x)).toEqual([24, 280, 536]);
    expect(chartPoints([2], box, [0, 4])[0].x).toBe(280);
    expect(chartAreaPath(chartPoints([2], box, [0, 4]), box)).toBe('');
  });
});
