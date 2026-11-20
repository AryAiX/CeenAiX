/**
 * QA-177: the doctor Settings sections. Used to validate ?section= links (an old or mistyped
 * link falls back safely) and to know which sections only show a "Coming soon" card.
 */
export const SETTINGS_SECTION_KEYS = [
  'general',
  'my-clinic',
  'appearance',
  'notifications',
  'dashboard',
  'clinical-tools',
  'lab-and-imaging',
  'privacy',
  'security',
  'language',
  'integrations',
  'help',
] as const;
export type SettingsSectionKey = (typeof SETTINGS_SECTION_KEYS)[number];

export const COMING_SOON_SECTIONS = [
  'appearance',
  'dashboard',
  'clinical-tools',
  'lab-and-imaging',
  'privacy',
  'integrations',
] as const;
export type ComingSoonSection = (typeof COMING_SOON_SECTIONS)[number];

export const isSettingsSection = (key: string | null): key is SettingsSectionKey =>
  key !== null && (SETTINGS_SECTION_KEYS as readonly string[]).includes(key);

export const isComingSoonSection = (key: string): key is ComingSoonSection =>
  (COMING_SOON_SECTIONS as readonly string[]).includes(key);
