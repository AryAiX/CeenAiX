import type { TFunction } from 'i18next';

/** Sample / seed lab ids → `laboratoryPage.labNames.*` */
export const LABORATORY_ID_TO_NAME_KEY: Record<string, string> = {
  '1': 'dubaiAdvanced',
  '2': 'healthCheck',
  '3': 'alBarshaMed',
  '4': 'emiratesDiagnostic',
  '5': 'cityLab',
  '6': 'premierMedical',
  'dubai-advanced-laboratory': 'dubaiAdvanced',
  'healthcheck-lab-center': 'healthCheck',
  'emirates-diagnostic-center': 'emiratesDiagnostic',
  'ceenaix-reference-lab': 'premierMedical',
};

/** English location from API/sample → `laboratoryPage.locations.*` */
export const LABORATORY_LOCATION_TO_KEY: Record<string, string> = {
  'Dubai Healthcare City': 'dubaiHealthcareCity',
  Jumeirah: 'jumeirah',
  'Al Barsha': 'alBarsha',
  'Dubai Marina': 'dubaiMarina',
  Deira: 'deira',
  'Business Bay': 'businessBay',
};

/** Exact English hours string → `laboratoryPage.hours.*` */
export const LABORATORY_HOURS_TO_KEY: Record<string, string> = {
  '7:00 AM - 9:00 PM': 'sevenToNine',
  '8:00 AM - 8:00 PM': 'eightToEight',
  '8:00 AM - 7:00 PM': 'eightToSeven',
  '7:00 AM - 10:00 PM': 'sevenToTen',
  '24/7': 'open24',
};

/** Service label from API/sample → `laboratoryPage.services.*` */
export const LABORATORY_SERVICE_TO_KEY: Record<string, string> = {
  'Blood Tests': 'bloodTests',
  Radiology: 'radiology',
  Pathology: 'pathology',
  'Genetic Testing': 'geneticTesting',
  'COVID-19 PCR': 'covidPcr',
  'Urine Analysis': 'urineAnalysis',
  'X-Ray': 'xRay',
  Ultrasound: 'ultrasound',
  ECG: 'ecg',
  Microbiology: 'microbiology',
  Immunology: 'immunology',
  MRI: 'mri',
  'CT Scan': 'ctScan',
  'Nuclear Medicine': 'nuclearMedicine',
  Chemistry: 'chemistry',
  Hematology: 'hematology',
  'Advanced Diagnostics': 'advancedDiagnostics',
  'Molecular Testing': 'molecularTesting',
  Toxicology: 'toxicology',
};

export const displayLaboratoryName = (t: TFunction, id: string, fallback: string): string => {
  const leaf = LABORATORY_ID_TO_NAME_KEY[id];
  if (!leaf) return fallback;
  const key = `laboratoryPage.labNames.${leaf}`;
  const out = t(key);
  return out === key ? fallback : out;
};

export const displayLaboratoryLocation = (t: TFunction, location: string): string => {
  const leaf = LABORATORY_LOCATION_TO_KEY[location];
  if (!leaf) return location;
  const key = `laboratoryPage.locations.${leaf}`;
  const out = t(key);
  return out === key ? location : out;
};

export const displayLaboratoryHours = (t: TFunction, hours: string): string => {
  const leaf = LABORATORY_HOURS_TO_KEY[hours];
  if (!leaf) return hours;
  const key = `laboratoryPage.hours.${leaf}`;
  const out = t(key);
  return out === key ? hours : out;
};

export const displayLaboratoryService = (t: TFunction, service: string): string => {
  const leaf = LABORATORY_SERVICE_TO_KEY[service];
  if (!leaf) return service;
  const key = `laboratoryPage.services.${leaf}`;
  const out = t(key);
  return out === key ? service : out;
};

export const laboratorySearchHaystack = (
  t: TFunction,
  lab: {
    id: string;
    slug?: string;
    name: string;
    location: string;
    opening_hours?: string;
    openingHours?: string;
    services: string[];
  }
): string => {
  const directoryKey = lab.slug ?? lab.id;
  const openingHours = lab.openingHours ?? lab.opening_hours ?? '';
  const parts = [
    lab.name,
    lab.location,
    openingHours,
    displayLaboratoryName(t, directoryKey, lab.name),
    displayLaboratoryLocation(t, lab.location),
    displayLaboratoryHours(t, openingHours),
    ...lab.services,
    ...lab.services.map((s) => displayLaboratoryService(t, s)),
  ];
  return parts.join(' ').toLowerCase();
};
