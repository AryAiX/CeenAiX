import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/auth-context';

/**
 * QA-248: the clinic "Sign Out" question, shared by the sidebar, the top bar's account menu and the
 * phone menu (it used to live only in the sidebar, which phones and the collapsed sidebar don't show).
 * Starts on "Cancel", closes with Escape (QA-241), and says so when signing out fails.
 */
export default function ClinicSignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const P = 'clinic.portalPage';
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [failed, setFailed] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const handleSignOut = async () => {
    setSigningOut(true);
    setFailed(false);
    const { error } = await signOut();
    setSigningOut(false);
    if (!error) {
      onClose();
      navigate('/auth/login', { replace: true });
    } else {
      // it used to fail without a word
      setFailed(true);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="clinic-signout-title"
        aria-describedby="clinic-signout-body"
        dir={i18n.dir()}
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6"
      >
        <h3 id="clinic-signout-title" className="text-lg font-bold text-gray-900">{t(`${P}.signOut`)}</h3>
        <p id="clinic-signout-body" className="mt-2 text-sm text-gray-500">{t(`${P}.signOutQuestion`)}</p>
        {failed ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t(`${P}.signOutFailed`)}</p>
        ) : null}
        <div className="mt-6 flex items-center gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {t('clinic.actions.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {signingOut ? t(`${P}.signingOut`) : t(`${P}.signOutConfirm`)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
