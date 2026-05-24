import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  PREVIEW_PIN_CODE,
  grantPreviewAccess,
  isPreviewAccessGranted,
  isPreviewPinGateEnabled,
  PREVIEW_ACCESS_CHANGED_EVENT,
} from '../lib/preview-access';
import { FORM_FIELD_LIMITS } from '../lib/form-field-limits';

interface PreviewPinGateProps {
  children: ReactNode;
}

export const PreviewPinGate = ({ children }: PreviewPinGateProps) => {
  const { t } = useTranslation('common');
  const [granted, setGranted] = useState(isPreviewAccessGranted);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const syncFromStorage = useCallback(() => {
    setGranted(isPreviewAccessGranted());
  }, []);

  useEffect(() => {
    window.addEventListener(PREVIEW_ACCESS_CHANGED_EVENT, syncFromStorage);
    return () => window.removeEventListener(PREVIEW_ACCESS_CHANGED_EVENT, syncFromStorage);
  }, [syncFromStorage]);

  const gateOn = isPreviewPinGateEnabled();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const trimmed = pin.trim();
    if (trimmed === PREVIEW_PIN_CODE) {
      grantPreviewAccess();
      setPin('');
      return;
    }
    setError(t('previewPinGate.invalidPin'));
  };

  if (!gateOn || granted) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-ceenai-blue px-4 py-10 text-slate-100">
      <div className="absolute top-4 end-4 z-[10000] sm:top-6 sm:end-6">
        <LanguageSwitcher variant="dark" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-ceenai-blue/30 p-4 ring-1 ring-white/20">
            <Lock className="h-10 w-10 text-cyan-200" aria-hidden />
          </div>
        </div>
        <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-white">
          {t('previewPinGate.title')}
        </h1>
        <p className="mb-8 text-center text-sm text-slate-300">{t('previewPinGate.subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="preview-pin" className="mb-1.5 block text-xs font-medium text-slate-400">
              {t('previewPinGate.pinLabel')}
            </label>
            <input
              id="preview-pin"
              name="preview-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={FORM_FIELD_LIMITS.shortText}
              className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-center text-lg tracking-widest text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="••••"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'preview-pin-error' : undefined}
            />
          </div>
          {error ? (
            <p id="preview-pin-error" className="text-center text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-ceenai-blue py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {t('previewPinGate.continue')}
          </button>
        </form>
      </div>
      <p className="mt-8 max-w-sm text-center text-xs text-slate-500">{t('previewPinGate.footerNote')}</p>
    </div>
  );
};
