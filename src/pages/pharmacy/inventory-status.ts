import type { PharmacyInventoryDerivedItem } from '../../hooks';

export type InventoryStockStatus = 'in_stock' | 'low' | 'critical' | 'out_of_stock';

/**
 * The stock level of an inventory item (usable stock against its reorder level), as the Inventory
 * page shows it. QA-288: shared with Reports, so both pages count the same way.
 */
export const inventoryStockStatus = (
  item: Pick<PharmacyInventoryDerivedItem, 'stock' | 'reorderPoint'>
): InventoryStockStatus => {
  if (item.stock <= 0) return 'out_of_stock';
  if (item.stock < item.reorderPoint) {
    return item.stock <= Math.max(1, Math.floor(item.reorderPoint / 2)) ? 'critical' : 'low';
  }
  return 'in_stock';
};

export interface InventoryRiskCounts {
  inStock: number;
  lowOrCritical: number;
  outOfStock: number;
  expiringSoon: number;
  expired: number;
}

/**
 * QA-288: the same counts as the Inventory figures. An item can be in a stock group and also be
 * expiring soon or have expired units (the old Reports breakdown put each item in one group only,
 * so a low item that was expiring was not counted as expiring, and expired stock was not shown).
 */
export const summarizeInventoryRisk = (
  items: ReadonlyArray<Pick<PharmacyInventoryDerivedItem, 'stock' | 'reorderPoint' | 'expiringSoon' | 'expiredStock'>>
): InventoryRiskCounts => {
  const counts: InventoryRiskCounts = { inStock: 0, lowOrCritical: 0, outOfStock: 0, expiringSoon: 0, expired: 0 };
  for (const item of items) {
    const status = inventoryStockStatus(item);
    if (status === 'in_stock') counts.inStock += 1;
    else if (status === 'out_of_stock') counts.outOfStock += 1;
    else counts.lowOrCritical += 1;
    if (item.expiringSoon) counts.expiringSoon += 1;
    if (item.expiredStock > 0) counts.expired += 1;
  }
  return counts;
};
