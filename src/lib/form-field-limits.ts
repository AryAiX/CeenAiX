/** Shared client-side input limits for forms across portals. */
export const FORM_FIELD_LIMITS = {
  personName: 120,
  phone: 32,
  email: 254,
  emiratesId: 20,
  licenseNumber: 40,
  address: 500,
  shortText: 200,
  clinicalNotes: 2000,
  chatMessage: 4000,
  /** Maximum length for password fields (sign-up / profile); auth providers may enforce less. */
  password: 128,
  searchQuery: 200,
  icdCode: 20,
  doseNumberMax: 99,
} as const;

export const PATIENT_RECORD_FIELD_LIMITS = {
  conditionName: FORM_FIELD_LIMITS.shortText,
  icdCode: FORM_FIELD_LIMITS.icdCode,
  notes: FORM_FIELD_LIMITS.clinicalNotes,
  allergen: FORM_FIELD_LIMITS.shortText,
  reaction: 1000,
  vaccineName: FORM_FIELD_LIMITS.shortText,
  administeredBy: FORM_FIELD_LIMITS.shortText,
  doseNumberMax: FORM_FIELD_LIMITS.doseNumberMax,
} as const;
