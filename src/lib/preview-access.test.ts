import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPreviewPinGateEnabled } from './preview-access';

describe('isPreviewPinGateEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires PIN on production and dev hostnames at runtime', () => {
    vi.stubEnv('VITE_PREVIEW_PIN_GATE', 'false');

    for (const hostname of ['www.ceenaix.com', 'ceenaix.com', 'dev.ceenaix.com']) {
      vi.stubGlobal('window', { location: { hostname } } as Window);
      expect(isPreviewPinGateEnabled()).toBe(true);
    }
  });

  it('respects VITE_PREVIEW_PIN_GATE=false on localhost', () => {
    vi.stubEnv('VITE_PREVIEW_PIN_GATE', 'false');
    vi.stubGlobal('window', { location: { hostname: 'localhost' } } as Window);
    expect(isPreviewPinGateEnabled()).toBe(false);
  });

  it('defaults to enabled on localhost when env is unset', () => {
    vi.stubEnv('VITE_PREVIEW_PIN_GATE', undefined);
    vi.stubGlobal('window', { location: { hostname: 'localhost' } } as Window);
    expect(isPreviewPinGateEnabled()).toBe(true);
  });
});
