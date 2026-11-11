import { isInsideMobileApp } from './save-file';

/**
 * QA-102: inside the phone app, the strip behind the clock and battery is drawn by the app, not by
 * this page, so it stayed bright white while a sheet, pop-up or the menu dimmed everything else.
 * While such an overlay is open, this tells the app the dimmed colour to paint that strip, and
 * tells it to go back to white when the overlay closes. Outside the app it does nothing.
 *
 * Overlays are found by the "sheet-backdrop" class (all pop-ups and sheets) or a data-dim-status-bar
 * attribute. The slide-out menu does not use it on purpose: its white panel looks best under a white strip.
 */

export const STATUS_BAR_MESSAGE_TYPE = 'ceenaix:status-bar';
const OVERLAY_SELECTOR = '.sheet-backdrop, [data-dim-status-bar]';

const toHex = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');

/** The colour you see when a semi-transparent overlay sits on white, as #rrggbb; null for no visible overlay. */
export function overlayColorOnWhite(cssColor: string): string | null {
  const match = cssColor.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/i);
  if (!match) return null;
  const [r, g, b] = [match[1], match[2], match[3]].map(Number);
  const rawAlpha = match[4];
  const alpha =
    rawAlpha === undefined ? 1 : rawAlpha.endsWith('%') ? Number(rawAlpha.slice(0, -1)) / 100 : Number(rawAlpha);
  if (!Number.isFinite(alpha) || alpha <= 0) return null;
  const blend = (channel: number) => 255 * (1 - alpha) + channel * alpha;
  return `#${toHex(blend(r))}${toHex(blend(g))}${toHex(blend(b))}`;
}

function currentOverlayColor(): string | null {
  const overlays = [...document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR)].filter(
    (element) => element.getClientRects().length > 0
  );
  const top = overlays[overlays.length - 1];
  return top ? overlayColorOnWhite(getComputedStyle(top).backgroundColor) : null;
}

/** Starts watching once; returns a function that stops it. */
export function startAppStatusBarSync(): () => void {
  if (!isInsideMobileApp() || typeof MutationObserver === 'undefined') return () => undefined;

  let lastSent: string | null = null;
  let scheduled = false;

  const sync = () => {
    scheduled = false;
    const color = currentOverlayColor();
    if (color === lastSent) return;
    lastSent = color;
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: STATUS_BAR_MESSAGE_TYPE, color }));
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  schedule();
  return () => observer.disconnect();
}
