import type { LabOrderItem } from '../types';

/**
 * QA-144: Reorder on Lab Referrals copies the original tests into New Lab Order (it used to open an
 * empty form with only the patient chosen). The list already has the tests, so they travel in the
 * navigation state, already resolved like a catalog pick.
 */
export interface ReorderLabItem {
  labTestCatalogId: string | null;
  labTestCatalogSuggestionId: string | null;
  testName: string;
  testNameAr: string;
  testCode: string;
  loincCode: string;
  specimen: string;
}

type ReorderSource = Pick<
  LabOrderItem,
  | 'parent_item_id'
  | 'test_name'
  | 'test_name_ar'
  | 'test_code'
  | 'loinc_code'
  | 'specimen_type'
  | 'lab_test_catalog_id'
  | 'lab_test_catalog_suggestion_id'
>;

/** Top-level tests only: the parts of a panel come back with the panel when the lab runs it. */
export const reorderItemsFrom = (items: ReorderSource[]): ReorderLabItem[] =>
  items
    .filter((item) => !item.parent_item_id && item.test_name?.trim())
    .map((item) => ({
      labTestCatalogId: item.lab_test_catalog_id ?? null,
      labTestCatalogSuggestionId: item.lab_test_catalog_suggestion_id ?? null,
      testName: item.test_name.trim(),
      testNameAr: item.test_name_ar ?? '',
      testCode: item.test_code ?? '',
      loincCode: item.loinc_code ?? '',
      specimen: item.specimen_type ?? '',
    }));
