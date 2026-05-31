import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, X } from 'lucide-react';
import type { ConsultationConsentMethod } from '../../types';
import { SignaturePad } from './SignaturePad';
import type { ScribeConsentInput } from '../../hooks/use-consultation-scribe-controller';

interface ConsentModalProps {
  open: boolean;
  patientName: string;
  onClose: () => void;
  onConfirm: (input: ScribeConsentInput) => void;
}

export function ConsentModal({ open, patientName, onClose, onConfirm }: ConsentModalProps) {
  const { t } = useTranslation('common');
  const [informed, setInformed] = useState(false);
  const [verbal, setVerbal] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setInformed(false);
      setVerbal(false);
      setSignature(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const canConfirm = informed && verbal;
  const consentMethod: ConsultationConsentMethod = signature ? 'signed' : 'verbal';

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      informedPatient: informed,
      verbalConsent: verbal,
      consentMethod,
      signatureImageUrl: signature,
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-bold text-slate-900">{t('doctor.consultationScribe.consent.title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
            aria-label={t('doctor.consultationScribe.consent.cancel')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-slate-600">
            {t('doctor.consultationScribe.consent.subtitle', { name: patientName })}
          </p>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={informed}
              onChange={(event) => setInformed(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span>{t('doctor.consultationScribe.consent.informed')}</span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={verbal}
              onChange={(event) => setVerbal(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span>{t('doctor.consultationScribe.consent.verbal')}</span>
          </label>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              {t('doctor.consultationScribe.consent.signatureTitle')}
            </p>
            <p className="mb-2 text-xs text-slate-500">{t('doctor.consultationScribe.consent.signatureHint')}</p>
            <SignaturePad
              onChange={setSignature}
              clearLabel={t('doctor.consultationScribe.consent.clearSignature')}
              ariaLabel={t('doctor.consultationScribe.consent.signatureTitle')}
            />
          </div>

          <p className="text-xs text-slate-500">
            {t('doctor.consultationScribe.consent.method')}:{' '}
            <span className="font-semibold text-slate-700">
              {consentMethod === 'signed'
                ? t('doctor.consultationScribe.consent.methodSigned')
                : t('doctor.consultationScribe.consent.methodVerbal')}
            </span>
          </p>

          {!canConfirm ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
              {t('doctor.consultationScribe.consent.required')}
            </p>
          ) : null}
        </div>

        <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('doctor.consultationScribe.consent.cancel')}
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('doctor.consultationScribe.consent.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
