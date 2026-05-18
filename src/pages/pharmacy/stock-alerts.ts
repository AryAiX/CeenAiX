export type PharmacyStockAlertSeverity = 'out' | 'low' | 'near_expiry';

export interface PharmacyStockAlertSortable {
  severity: PharmacyStockAlertSeverity | string;
  quantity: number;
}

const STOCK_ALERT_SEVERITY_RANK: Record<string, number> = {
  out: 0,
  low: 1,
  near_expiry: 2,
};

export const compareStockAlerts = (
  a: PharmacyStockAlertSortable,
  b: PharmacyStockAlertSortable
) => {
  const severityDiff =
    (STOCK_ALERT_SEVERITY_RANK[a.severity] ?? 99) -
    (STOCK_ALERT_SEVERITY_RANK[b.severity] ?? 99);
  if (severityDiff !== 0) {
    return severityDiff;
  }
  return a.quantity - b.quantity;
};
