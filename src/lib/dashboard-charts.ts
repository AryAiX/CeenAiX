/**
 * Small helpers for the Dashboard HbA1c and blood pressure charts (QA-010).
 *
 * The charts used fixed ranges (HbA1c 5.5–8.5, systolic 100–150, diastolic 60–100), so readings
 * outside them were drawn past the chart edge, and systolic and diastolic each had their own scale,
 * so 128/82 showed both lines at the same height. These helpers fit one range to the readings
 * (plus any reference values that must stay visible) and keep everything inside the chart.
 */

export interface ChartBox {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

export interface ChartPoint {
  x: number;
  y: number;
  value: number;
}

/** A range that covers every value and reference line, widened by `padding` and rounded out to `step`. */
export function fitChartDomain(values: number[], references: number[], padding: number, step: number): [number, number] {
  const all = [...values, ...references].filter((value) => Number.isFinite(value));
  if (all.length === 0) return [0, step];
  const low = Math.floor((Math.min(...all) - padding) / step) * step;
  let high = Math.ceil((Math.max(...all) + padding) / step) * step;
  if (high <= low) high = low + step;
  return [low, high];
}

export function chartY(value: number, box: ChartBox, domain: [number, number]): number {
  const [low, high] = domain;
  const drawable = box.height - box.padTop - box.padBottom;
  const ratio = (value - low) / (high - low || 1);
  return box.height - box.padBottom - Math.min(1, Math.max(0, ratio)) * drawable;
}

/** Evenly spaced points, oldest on the left; a single reading sits in the middle. */
export function chartPoints(values: number[], box: ChartBox, domain: [number, number]): ChartPoint[] {
  const drawable = box.width - box.padLeft - box.padRight;
  return values.map((value, index) => ({
    x: values.length === 1 ? box.padLeft + drawable / 2 : box.padLeft + (index / (values.length - 1)) * drawable,
    y: chartY(value, box, domain),
    value,
  }));
}

export function chartLinePath(points: ChartPoint[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

export function chartAreaPath(points: ChartPoint[], box: ChartBox): string {
  if (points.length < 2) return '';
  const baseline = (box.height - box.padBottom).toFixed(2);
  return `${chartLinePath(points)} L${points[points.length - 1].x.toFixed(2)} ${baseline} L${points[0].x.toFixed(2)} ${baseline} Z`;
}
