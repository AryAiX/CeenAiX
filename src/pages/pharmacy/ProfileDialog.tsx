import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface ProfileDialogProps {
  id: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  maxWidthClass?: string;
}

/**
 * QA-296: the Profile page dialogs. They were plain boxes: not announced as dialogs, the ✕ button
 * had no name, Escape did nothing, focus stayed on the page behind, and a long dialog ran off a
 * phone screen. This one is a modal dialog with a title, closes on Escape, moves focus into the
 * dialog and back to the button that opened it, and scrolls its body.
 */
export const ProfileDialog = ({ id, title, subtitle, onClose, children, footer, maxWidthClass = 'max-w-lg' }: ProfileDialogProps) => {
  const { t } = useTranslation('common');
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${maxWidthClass}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 break-words text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('pharmacy.profile.closeDialog', { defaultValue: 'Close' })}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-6 py-4">{children}</div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">{footer}</div>
      </div>
    </div>,
    document.body
  );
};
