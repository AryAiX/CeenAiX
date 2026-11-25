/**
 * QA-161: the top-bar bell keeps its own unread count. Pages that change the read state of
 * notifications announce it so the bell can reload instead of showing a stale number.
 */
export const NOTIFICATIONS_CHANGED_EVENT = 'ceenaix:notifications-changed';

export const announceNotificationsChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
};

/**
 * QA-220: unread message counts (the clinic sidebar badge) reload when a conversation's messages
 * are marked as read, instead of keeping the number from login.
 */
export const MESSAGES_READ_EVENT = 'ceenaix:messages-read';

export const announceMessagesRead = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
};
