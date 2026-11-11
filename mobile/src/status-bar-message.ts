/**
 * QA-102: while a sheet, pop-up or the menu is open, the portal sends the dimmed colour the strip behind
 * the clock should have ({ type: 'ceenaix:status-bar', color: '#rrggbb' }), and color: null when it closes.
 * Only a plain #rrggbb colour is accepted.
 */
export const STATUS_BAR_MESSAGE_TYPE = 'ceenaix:status-bar';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** undefined = not a status-bar message; null = go back to the normal colour; otherwise the colour to use. */
export function parseStatusBarMessage(data: string): string | null | undefined {
  let message: unknown;
  try {
    message = JSON.parse(data);
  } catch {
    return undefined;
  }
  if (typeof message !== 'object' || message === null) return undefined;
  const { type, color } = message as Record<string, unknown>;
  if (type !== STATUS_BAR_MESSAGE_TYPE) return undefined;
  if (color === null) return null;
  return typeof color === 'string' && HEX_COLOR.test(color) ? color : undefined;
}
