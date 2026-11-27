import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { countUnreadMessages } from '../lib/clinic-unread-messages';
import { MESSAGES_READ_EVENT } from '../lib/notification-events';
import { supabase } from '../lib/supabase';

/** How often the badge looks for new messages while the page is open. */
export const PHARMACY_UNREAD_REFRESH_MS = 60_000;

/**
 * QA-275: the pharmacy's unread messages, from the real conversations (the Messages badge used to
 * add up the old demo table `pharmacy_messages`, which has nothing to do with them). Uses the same
 * count as the clinic portal (QA-220) and reloads when messages are read, when the pharmacist comes
 * back to the tab, and every minute. Undefined until the first count arrives.
 */
export function usePharmacyUnreadMessages(): number | undefined {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const refresh = () => {
      countUnreadMessages(supabase, userId)
        .then((next) => {
          if (!cancelled) setCount(next);
        })
        .catch((error: unknown) =>
          console.warn(`[pharmacy] could not count unread messages: ${error instanceof Error ? error.message : String(error)}`)
        );
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
    window.addEventListener(MESSAGES_READ_EVENT, refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') refresh();
    }, PHARMACY_UNREAD_REFRESH_MS);
    return () => {
      cancelled = true;
      window.removeEventListener(MESSAGES_READ_EVENT, refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [userId]);

  return count;
}
