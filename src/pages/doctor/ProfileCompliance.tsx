import React from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Clock } from 'lucide-react';
import { dateTimeFormatWithNumerals, resolveLocale } from '../../lib/i18n-ui';

interface ProfileComplianceProps {
  licenseNumber: string | null;
  verified: boolean;
  verifiedAt: string | null;
}

/**
 * QA-173: "DHA & compliance" tab on the doctor Profile. Read-only: licence number,
 * verification status and date, and how verification works (see QA-168).
 */
export const ProfileCompliance: React.FC<ProfileComplianceProps> = ({ licenseNumber, verified, verifiedAt }) => {
  const { t, i18n } = useTranslation('common');
  const C = 'doctor.profile.compliance.';
  const verifiedDate = verifiedAt
    ? new Date(verifiedAt).toLocaleDateString(
        resolveLocale(i18n.language),
        dateTimeFormatWithNumerals(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })
      )
    : null;

  return (
    <div className="space-y-5">
      <dl className="grid max-w-2xl gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{t(`${C}licence`)}</dt>
          <dd className="mt-1 font-mono text-base text-slate-900" data-testid="compliance-licence">
            {licenseNumber ? <bdi>{licenseNumber}</bdi> : t('doctor.profile.notProvided')}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{t(`${C}status`)}</dt>
          <dd
            className={`mt-1 flex items-center gap-1.5 text-base font-semibold ${verified ? 'text-emerald-700' : 'text-amber-700'}`}
            data-testid="compliance-status"
          >
            {verified ? (
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Clock className="h-4 w-4" aria-hidden="true" />
            )}
            {verified ? t(`${C}verified`) : t(`${C}pending`)}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{t(`${C}verifiedOn`)}</dt>
          <dd className="mt-1 text-base text-slate-900" data-testid="compliance-date">
            {verified && verifiedDate ? verifiedDate : '—'}
          </dd>
        </div>
      </dl>

      <div className="max-w-2xl space-y-2 text-sm text-slate-600">
        <p>{verified ? t(`${C}explainVerified`) : t(`${C}explainPending`)}</p>
        <p>{t(`${C}explainLicenceChange`)}</p>
        {!verified ? (
          <p>
            {t(`${C}howToVerify`)} <bdi className="font-semibold text-slate-900">support@ceenaix.com</bdi>
          </p>
        ) : null}
      </div>
    </div>
  );
};
