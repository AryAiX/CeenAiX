import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { placeRowMenu } from '../lib/row-menu-position';
import { RowActionsMenu } from './RowActionsMenu';

const viewport = { width: 1200, height: 800 };
const menu = { width: 192, height: 120 };
const button = (top: number, left = 1000) => ({ top, bottom: top + 30, left, right: left + 30 });

describe('placeRowMenu (QA-244)', () => {
  it('opens below the button, aligned to its right edge in English', () => {
    expect(placeRowMenu(button(100), menu, viewport, 'ltr')).toEqual({ top: 134, left: 1030 - 192, placement: 'below' });
  });

  it('opens above the button when there is no room below', () => {
    expect(placeRowMenu(button(700), menu, viewport, 'ltr')).toEqual({ top: 700 - 4 - 120, left: 838, placement: 'above' });
  });

  it('aligns to the left edge in Arabic and stays on screen', () => {
    expect(placeRowMenu(button(100, 1100), menu, viewport, 'rtl').left).toBe(1200 - 8 - 192);
    expect(placeRowMenu(button(100, 0), menu, viewport, 'ltr').left).toBe(8);
  });
});

const renderInScrollBox = (onRemove = vi.fn(), dir: 'ltr' | 'rtl' = 'ltr') =>
  render(
    <div dir={dir}>
      <div data-testid="scroll-box" className="overflow-x-auto">
        <RowActionsMenu
          label="More actions for Dr A"
          actions={[
            { key: 'edit', label: 'Edit Fee', onSelect: vi.fn() },
            { key: 'remove', label: 'Remove', tone: 'danger', onSelect: onRemove },
          ]}
        />
      </div>
    </div>
  );

describe('RowActionsMenu (QA-244)', () => {
  it('draws the menu on top of the page, not inside the scrolling table box', () => {
    renderInScrollBox();
    fireEvent.click(screen.getByRole('button', { name: 'More actions for Dr A' }));
    const opened = screen.getByRole('menu');
    expect(screen.getByTestId('scroll-box').contains(opened)).toBe(false);
    expect(opened.parentElement).toBe(document.body);
    expect(opened).toHaveClass('fixed');
  });

  it('runs the action and closes', () => {
    const onRemove = vi.fn();
    renderInScrollBox(onRemove);
    fireEvent.click(screen.getByRole('button', { name: 'More actions for Dr A' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('focuses the first action, moves with the arrow keys and closes on Escape back to the button', () => {
    renderInScrollBox();
    const trigger = screen.getByRole('button', { name: 'More actions for Dr A' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Edit Fee' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Remove' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on a click outside and when the page scrolls', () => {
    renderInScrollBox();
    const trigger = screen.getByRole('button', { name: 'More actions for Dr A' });
    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.scroll(window);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps the Arabic direction although the menu is drawn on <body>', () => {
    renderInScrollBox(vi.fn(), 'rtl');
    fireEvent.click(screen.getByRole('button', { name: 'More actions for Dr A' }));
    expect(screen.getByRole('menu')).toHaveAttribute('dir', 'rtl');
  });

  it('shows no button when there is nothing to do', () => {
    render(<RowActionsMenu label="More actions" actions={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
