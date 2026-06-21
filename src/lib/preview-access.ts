/** Client-side preview only; bypassable in devtools. Disable at launch with VITE_PREVIEW_PIN_GATE=false. */
export const PREVIEW_ACCESS_STORAGE_KEY = 'ceenaix_preview_access_v1';
const PREVIEW_ACCESS_MARKER = '1';
export const PREVIEW_PIN_CODE = '6969';

export const PREVIEW_ACCESS_CHANGED_EVENT = 'ceenaix-preview-access-changed';

/** Hosted domains that always require the preview PIN until public launch. */
const PREVIEW_PIN_GATED_HOSTS = new Set(['ceenaix.com', 'www.ceenaix.com', 'dev.ceenaix.com']);

export function isPreviewPinGateEnabled(): boolean {
  if (typeof window !== 'undefined') {
    if (PREVIEW_PIN_GATED_HOSTS.has(window.location.hostname)) {
      return true;
    }
  }

  return import.meta.env.VITE_PREVIEW_PIN_GATE !== 'false';
}

export function isPreviewAccessGranted(): boolean {
  try {
    return sessionStorage.getItem(PREVIEW_ACCESS_STORAGE_KEY) === PREVIEW_ACCESS_MARKER;
  } catch {
    return false;
  }
}

export function grantPreviewAccess(): void {
  try {
    sessionStorage.setItem(PREVIEW_ACCESS_STORAGE_KEY, PREVIEW_ACCESS_MARKER);
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new Event(PREVIEW_ACCESS_CHANGED_EVENT));
}

export function clearPreviewAccess(): void {
  try {
    sessionStorage.removeItem(PREVIEW_ACCESS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREVIEW_ACCESS_CHANGED_EVENT));
}
