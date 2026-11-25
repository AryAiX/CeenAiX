import { vi } from 'vitest';

/**
 * QA-249: make window.matchMedia answer like a phone (or a wider screen) for useIsPhone.
 * jsdom has no matchMedia; call the returned function to remove it again.
 */
export const mockScreen = (phone: boolean) => {
  const previous = window.matchMedia;
  window.matchMedia = vi.fn((query: string) => ({
    matches: phone && query.includes('max-width: 767px'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = previous;
  };
};
