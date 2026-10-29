const rawWebUrl = process.env.EXPO_PUBLIC_WEB_URL?.trim() || 'https://www.ceenaix.com';

/** Origin of the web portal the app loads, without a trailing slash. */
export const WEB_URL = rawWebUrl.replace(/\/+$/, '');
export const WEB_ORIGIN = new URL(WEB_URL).origin;

/** First screen for a fresh install; the web login redirects signed-in patients to their portal. */
export const START_PATH = '/auth/login?role=patient';

export const APP_SCHEME = 'ceenaix';

/** How long the app can sit in the background before Face ID / fingerprint is required again. */
export const RELOCK_AFTER_MS = 5 * 60 * 1000;

/** Appended to the web view user agent so the web app can recognise the native shell. */
export const USER_AGENT_SUFFIX = 'CeenAiXApp/1.0';
