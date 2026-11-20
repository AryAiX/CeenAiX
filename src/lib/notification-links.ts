/**
 * QA-163: a stored notification's action_url comes from the database. Only follow it when it is
 * an in-app path inside the given portal (e.g. '/doctor/...'); anything else gets no Open button.
 */
export const safePortalActionPath = (portal: string, href: string | null | undefined): string | null => {
  const raw = href?.trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;

  let url: URL;
  try {
    url = new URL(raw, 'https://app.invalid');
  } catch {
    return null;
  }
  if (url.origin !== 'https://app.invalid') return null;

  const base = `/${portal}`;
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path !== base && !path.startsWith(`${base}/`)) return null;

  return `${path}${url.search}${url.hash}`;
};
