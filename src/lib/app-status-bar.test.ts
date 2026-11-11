import { describe, expect, it } from 'vitest';
import { overlayColorOnWhite } from './app-status-bar';

describe('overlayColorOnWhite (QA-102)', () => {
  it('blends the overlay over white', () => {
    expect(overlayColorOnWhite('rgba(0, 0, 0, 0.4)')).toBe('#999999');
    expect(overlayColorOnWhite('rgba(0, 0, 0, 0.5)')).toBe('#808080');
    expect(overlayColorOnWhite('rgb(15 23 42 / 0.4)')).toBe('#9fa2aa');
    expect(overlayColorOnWhite('rgb(15 23 42 / 40%)')).toBe('#9fa2aa');
  });

  it('ignores invisible or unreadable colours', () => {
    expect(overlayColorOnWhite('rgba(0, 0, 0, 0)')).toBeNull();
    expect(overlayColorOnWhite('transparent')).toBeNull();
  });
});
