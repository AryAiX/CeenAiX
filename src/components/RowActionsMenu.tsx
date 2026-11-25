import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { placeRowMenu } from '../lib/row-menu-position';

/**
 * QA-244: the "⋮" actions menu of a table row.
 *
 * The menu used to be placed inside the row, so a table that scrolls sideways (overflow-x-auto)
 * cut it off and the user had to scroll inside the card to reach the actions. Now the menu is drawn
 * on top of the page (a portal on <body>), next to the button: below it, or above it when there is
 * no room below, and aligned to the button's end edge (right in English, left in Arabic).
 * It closes on Escape (focus goes back to the button), on a click outside, and when the page
 * scrolls or is resized. Arrow keys, Home and End move between the actions.
 *
 * QA-248: `trigger` / `triggerClassName` replace the "⋮" button, e.g. the clinic top bar's account menu.
 */
export interface RowAction {
  key: string;
  label: string;
  icon?: ReactNode;
  tone?: 'neutral' | 'danger' | 'success';
  onSelect: () => void;
}

const toneClass: Record<NonNullable<RowAction['tone']>, string> = {
  neutral: 'text-slate-600 hover:bg-slate-50 focus:bg-slate-50',
  danger: 'text-red-600 hover:bg-red-50 focus:bg-red-50',
  success: 'text-emerald-600 hover:bg-emerald-50 focus:bg-emerald-50',
};

export function RowActionsMenu({
  label,
  actions,
  trigger,
  triggerClassName,
  testId,
}: {
  label: string;
  actions: RowAction[];
  trigger?: ReactNode;
  triggerClassName?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setPosition(null);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  // Place the menu once it is drawn (its size is known then).
  useLayoutEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;
    const direction = button.closest('[dir]')?.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr';
    setDir(direction);
    const spot = placeRowMenu(
      button.getBoundingClientRect(),
      { width: menu.offsetWidth, height: menu.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      direction
    );
    setPosition({ top: spot.top, left: spot.left });
  }, [open]);

  // Focus the first action when the menu opens.
  useEffect(() => {
    if (open && position) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open, position]);

  // Close on a click outside, Escape, scroll or resize.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    const onMove = () => close(false);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, close]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else if (event.key === 'Tab') close(false);
    if (next !== null) {
      event.preventDefault();
      items[next].focus();
    }
  };

  if (actions.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close(false) : setOpen(true))}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-testid={testId}
        className={triggerClassName ?? 'p-1.5 hover:bg-slate-100 rounded-lg transition-colors'}
      >
        {trigger ?? <MoreVertical size={15} className="text-slate-400" aria-hidden="true" />}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            dir={dir}
            onKeyDown={onMenuKeyDown}
            data-testid="row-actions-menu"
            className="fixed z-[90] w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1"
            style={{ top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? 'visible' : 'hidden' }}
          >
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close(false);
                  action.onSelect();
                }}
                className={`w-full px-4 py-2 text-start text-sm flex items-center gap-2 outline-none ${toneClass[action.tone ?? 'neutral']}`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
