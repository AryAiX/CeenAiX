/** QA-244: where the row "⋮" menu is drawn (see components/RowActionsMenu). */
export interface MenuAnchorBox {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const GAP = 4;
const MARGIN = 8;

/** Where to draw the menu (viewport pixels). Below the button if it fits, else above, kept on screen. */
export const placeRowMenu = (
  anchor: MenuAnchorBox,
  menu: { width: number; height: number },
  viewport: { width: number; height: number },
  dir: 'ltr' | 'rtl'
): { top: number; left: number; placement: 'below' | 'above' } => {
  const fitsBelow = anchor.bottom + GAP + menu.height <= viewport.height - MARGIN;
  const fitsAbove = anchor.top - GAP - menu.height >= MARGIN;
  const placement = !fitsBelow && fitsAbove ? 'above' : 'below';
  const rawTop = placement === 'above' ? anchor.top - GAP - menu.height : anchor.bottom + GAP;
  const top = Math.max(MARGIN, Math.min(rawTop, viewport.height - MARGIN - menu.height));
  const preferredLeft = dir === 'rtl' ? anchor.left : anchor.right - menu.width;
  const left = Math.max(MARGIN, Math.min(preferredLeft, viewport.width - MARGIN - menu.width));
  return { top, left, placement };
};
