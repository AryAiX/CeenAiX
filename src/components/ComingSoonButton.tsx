import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ComingSoonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /**
   * Tooltip override. Defaults to a generic "coming in a later release"
   * message so the visual treatment is consistent across portals.
   */
  comingSoonTitle?: string;
}

const DEFAULT_TITLE =
  'This action is coming in a later release. The data on this page is already live.';

/**
 * Standardised wrapper for operational portal CTAs that are visible in the UI
 * but do not yet have a wired handler.
 *
 * Renders a real, focusable `<button>` so screen-reader and keyboard users can
 * still discover the control, but transparently disables it and surfaces a
 * tooltip explaining why. This avoids the silent "click goes nowhere" footgun
 * that Bolt prototypes left in many of the operational portals.
 */
export const ComingSoonButton = ({
  children,
  className = '',
  comingSoonTitle,
  ...rest
}: ComingSoonButtonProps) => {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title={comingSoonTitle ?? DEFAULT_TITLE}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      {...rest}
    >
      {children}
    </button>
  );
};
