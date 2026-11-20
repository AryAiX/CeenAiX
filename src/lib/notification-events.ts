/**
 * QA-161: the top-bar bell keeps its own unread count. Pages that change the read state of
 * notifications announce it so the bell can reload instead of showing a stale number.
 */
export const NOTIFICATIONS_CHANGED_EVENT = 'ceenaix:notifications-changed';

export const announceNotificationsChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
};
