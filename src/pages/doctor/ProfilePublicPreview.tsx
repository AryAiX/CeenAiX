import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle, Info, Stethoscope } from 'lucide-react';
import { useBookableDoctors } from '../../hooks';

/**
 * QA-173: "Public preview" tab on the doctor Profile. Shows the doctor card exactly as patients
 * see it when booking (same get_bookable_doctors data, same fields), plus tips about what is
 * missing or what patients can see.
 */
export const ProfilePublicPreview: React.FC<{ userId: string }> = ({ userId }) => {
  const { t } = useTranslation('common');
  const { data, loading, error, refetch } = useBookableDoctors();
  const doctor = (data ?? []).find((item) => item.userId === userId) ?? null;
  const P = 'doctor.profile.preview.';

  if (loading && !data) {
    return <p className="text-sm text-slate-500">{t(`${P}loading`)}</p>;
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t(`${P}errLoad`)}
        <button type="button" onClick={() => void refetch()} className="ms-2 font-semibold underline">
          {t('shared.retry')}
        </button>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-testid="preview-not-listed">
        {t(`${P}notListed`)}
      </div>
    );
  }

  const location = [doctor.city, doctor.address].filter(Boolean).join(' • ');
  const windows = doctor.activeAvailabilityCount;

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{t(`${P}intro`)}</p>

      {/* Same layout and fields as the doctor card on the patient booking page. */}
      <div
        className="max-w-xl rounded-2xl border border-gray-200 bg-white p-4 text-start shadow-sm"
        data-testid="public-preview-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-gray-900">{doctor.fullName}</p>
            <p className="mt-1 text-sm text-cyan-700">{doctor.specialty ?? t('shared.generalPractice')}</p>
            <p className="mt-2 text-sm text-gray-600">{location || t('shared.clinicTbd')}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
            {windows === 1
              ? t('shared.windowOne', { count: windows })
              : t('shared.windowMany', { count: windows })}
          </span>
        </div>
      </div>

      <ul className="space-y-2 text-sm" data-testid="public-preview-tips">
        {windows === 0 ? (
          <li className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t(`${P}tipNoSlots`)}{' '}
              <Link to="/doctor/schedule" className="font-semibold underline">
                {t(`${P}openSchedule`)}
              </Link>
            </span>
          </li>
        ) : null}
        {!doctor.specialty ? (
          <li className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
            <Stethoscope className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t(`${P}tipNoSpecialty`)}</span>
          </li>
        ) : null}
        {doctor.address ? (
          <li className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t(`${P}tipAddressVisible`)}</span>
          </li>
        ) : null}
        <li className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t(`${P}tipNotShown`)}</span>
        </li>
      </ul>
    </div>
  );
};
