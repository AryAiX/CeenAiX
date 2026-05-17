/** Client-side limits aligned with typical clinical chart field sizes (DB columns are unbounded text). */
export const PATIENT_RECORD_FIELD_LIMITS = {
  conditionName: 200,
  icdCode: 20,
  notes: 2000,
  allergen: 200,
  reaction: 1000,
  vaccineName: 200,
  administeredBy: 200,
  doseNumberMax: 99,
} as const;
