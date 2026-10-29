import { APP_SCHEME, WEB_ORIGIN, WEB_URL } from './config';

/** Maps `ceenaix://patient/appointments?x=1` to the same path on the web portal. */
export function deepLinkToWebUrl(url: string | null): string | null {
  if (!url) return null;
  const prefix = `${APP_SCHEME}://`;
  if (!url.toLowerCase().startsWith(prefix)) return null;
  const rest = url.slice(prefix.length).replace(/^\/+/, '');
  return rest ? `${WEB_URL}/${rest}` : null;
}

export function isPortalUrl(url: string): boolean {
  try {
    return new URL(url).origin === WEB_ORIGIN;
  } catch {
    return false;
  }
}

/** Paths before sign-in; the biometric re-lock only applies once the patient is inside the portal. */
export function isSignedInArea(url: string): boolean {
  if (!isPortalUrl(url)) return false;
  const { pathname } = new URL(url);
  return pathname !== '/' && !pathname.startsWith('/auth');
}

export const IN_WEBVIEW_SCHEMES = ['about:', 'blob:', 'data:'];

/** Schemes the OS should handle (phone, email, maps, store links). */
export const SYSTEM_SCHEMES = ['tel:', 'mailto:', 'sms:', 'geo:', 'maps:', 'whatsapp:', 'itms-apps:', 'market:', 'intent:'];
