import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockScreen } from '../test/phone-screen';
import { PHONE_MEDIA_QUERY, useIsPhone } from './use-is-phone';

let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
});

describe('useIsPhone (QA-249)', () => {
  it('is false where the browser cannot tell (no matchMedia), so the table shows as before', () => {
    expect(window.matchMedia).toBeUndefined();
    expect(renderHook(() => useIsPhone()).result.current).toBe(false);
  });

  it('is true on a phone-sized screen and false on a wider one', () => {
    restore = mockScreen(true);
    expect(renderHook(() => useIsPhone()).result.current).toBe(true);
    restore();
    restore = mockScreen(false);
    expect(renderHook(() => useIsPhone()).result.current).toBe(false);
  });

  it('follows the screen when it is turned or resized', () => {
    let listener: (() => void) | null = null;
    const query = { matches: false, addEventListener: vi.fn((_: string, fn: () => void) => { listener = fn; }), removeEventListener: vi.fn() };
    const previous = window.matchMedia;
    window.matchMedia = vi.fn(() => query) as unknown as typeof window.matchMedia;
    restore = () => { window.matchMedia = previous; };
    const { result, unmount } = renderHook(() => useIsPhone());
    expect(window.matchMedia).toHaveBeenCalledWith(PHONE_MEDIA_QUERY);
    expect(result.current).toBe(false);
    query.matches = true;
    act(() => listener?.());
    expect(result.current).toBe(true);
    unmount();
    expect(query.removeEventListener).toHaveBeenCalled();
  });
});
