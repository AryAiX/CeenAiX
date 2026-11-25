import { useEffect, useState } from 'react';

/**
 * QA-249: true on phone-sized screens (narrower than Tailwind's `md`, 768 px).
 *
 * The clinic tables show a card per row there, so status, fees and the action buttons are visible
 * without scrolling sideways. Only one layout is rendered (not both hidden with CSS), so screen
 * readers and the page's tests see one list. Where matchMedia does not exist (tests, old browsers)
 * this is false and the table is shown, as before.
 */
export const PHONE_MEDIA_QUERY = '(max-width: 767px)';

const matches = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_MEDIA_QUERY).matches;

export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(matches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(PHONE_MEDIA_QUERY);
    const onChange = () => setIsPhone(query.matches);
    onChange();
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  return isPhone;
}
