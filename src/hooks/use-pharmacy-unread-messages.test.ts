import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/clinic-unread-messages', () => ({ countUnreadMessages: vi.fn() }));

import { useAuth } from '../lib/auth-context';
import { countUnreadMessages } from '../lib/clinic-unread-messages';
import { announceMessagesRead } from '../lib/notification-events';
import { PHARMACY_UNREAD_REFRESH_MS, usePharmacyUnreadMessages } from './use-pharmacy-unread-messages';

describe('usePharmacyUnreadMessages (QA-275)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'pharmacist-1' } } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts the unread messages of the real conversations for the signed-in pharmacist', async () => {
    vi.mocked(countUnreadMessages).mockResolvedValue(3);

    const { result } = renderHook(() => usePharmacyUnreadMessages());

    await waitFor(() => expect(result.current).toBe(3));
    expect(countUnreadMessages).toHaveBeenCalledWith(expect.anything(), 'pharmacist-1');
  });

  it('counts again when messages are read and when the pharmacist comes back to the tab', async () => {
    vi.mocked(countUnreadMessages).mockResolvedValueOnce(3).mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const { result } = renderHook(() => usePharmacyUnreadMessages());
    await waitFor(() => expect(result.current).toBe(3));

    act(() => announceMessagesRead());
    await waitFor(() => expect(result.current).toBe(1));

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(result.current).toBe(2));
  });

  it('looks for new messages every minute', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    vi.mocked(countUnreadMessages).mockResolvedValue(0);
    renderHook(() => usePharmacyUnreadMessages());
    expect(countUnreadMessages).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(PHARMACY_UNREAD_REFRESH_MS);
    });

    expect(countUnreadMessages).toHaveBeenCalledTimes(2);
  });

  it('shows no number when nobody is signed in or the count fails', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);
    const { result: signedOut } = renderHook(() => usePharmacyUnreadMessages());
    expect(signedOut.current).toBeUndefined();
    expect(countUnreadMessages).not.toHaveBeenCalled();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'pharmacist-1' } } as never);
    vi.mocked(countUnreadMessages).mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => usePharmacyUnreadMessages());
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
    warn.mockRestore();
  });
});
