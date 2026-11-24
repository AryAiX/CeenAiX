import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Search, X } from 'lucide-react';
import {
  MIN_PATIENT_SEARCH_LENGTH,
  useClinicMessageDoctors,
  useClinicMessagePatients,
  type ClinicMessageContact,
} from '../hooks/use-clinic-message-contacts';
import { Skeleton } from './Skeleton';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

/**
 * QA-218: "New message" for clinics. Lists the clinic's doctors and finds patients with a visit at
 * the clinic; picking someone opens the existing conversation or starts one.
 */
export function ClinicContactPicker({
  userId,
  busyId,
  error,
  existingCounterpartIds,
  onPick,
  onClose,
}: {
  userId: string | null | undefined;
  busyId: string | null;
  error: string | null;
  existingCounterpartIds: Set<string>;
  onPick: (contactId: string) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('common');
  const P = 'clinic.messages.picker';
  const [query, setQuery] = useState('');
  const doctors = useClinicMessageDoctors(userId);
  const patients = useClinicMessagePatients(query);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const matchingDoctors = useMemo(() => {
    const text = query.trim().toLowerCase();
    return text ? doctors.data.filter((doctor) => doctor.name.toLowerCase().includes(text)) : doctors.data;
  }, [doctors.data, query]);

  const renderContact = (contact: ClinicMessageContact, label: string) => (
    <li key={contact.id}>
      <button
        type="button"
        disabled={busyId !== null}
        onClick={() => onPick(contact.id)}
        className="flex w-full items-center gap-3 rounded-xl border border-gray-100 px-3 py-3 text-start transition hover:border-teal-200 hover:bg-teal-50 disabled:cursor-wait disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-cyan-500 text-sm font-bold text-white"
        >
          {initials(contact.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-gray-900">{label}</span>
          {existingCounterpartIds.has(contact.id) ? (
            <span className="block truncate text-xs text-gray-500">{t(`${P}.openExisting`)}</span>
          ) : null}
        </span>
        {busyId === contact.id ? (
          <span className="text-xs text-gray-500">{t(`${P}.opening`)}</span>
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 rtl:rotate-180" aria-hidden="true" />
        )}
      </button>
    </li>
  );

  const patientSection = () => {
    if (query.trim().length < MIN_PATIENT_SEARCH_LENGTH) {
      return <p className="px-3 py-3 text-sm text-gray-500">{t(`${P}.patientHint`)}</p>;
    }
    if (patients.loading) return <Skeleton className="mx-2 h-14" />;
    if (patients.error) return <p className="px-3 py-3 text-sm text-red-700">{t(`${P}.searchError`)}</p>;
    if (patients.data.length === 0) return <p className="px-3 py-3 text-sm text-gray-500">{t(`${P}.noPatients`)}</p>;
    return <ul className="space-y-2">{patients.data.map((patient) => renderContact(patient, patient.name))}</ul>;
  };

  const doctorSection = () => {
    if (doctors.loading) {
      return (
        <div className="space-y-2 px-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      );
    }
    if (doctors.error) return <p className="px-3 py-3 text-sm text-red-700">{t(`${P}.loadError`)}</p>;
    if (doctors.data.length === 0) return <p className="px-3 py-3 text-sm text-gray-500">{t(`${P}.noDoctors`)}</p>;
    if (matchingDoctors.length === 0) return <p className="px-3 py-3 text-sm text-gray-500">{t(`${P}.noDoctorMatch`)}</p>;
    return (
      <ul className="space-y-2">
        {matchingDoctors.map((doctor) => renderContact(doctor, t(`${P}.doctorName`, { name: doctor.name })))}
      </ul>
    );
  };

  return createPortal(
    <div
      className="sheet-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clinic-contact-picker-title"
        dir={i18n.dir()}
        data-testid="clinic-contact-picker"
        className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 id="clinic-contact-picker-title" className="font-bold text-gray-900">
              {t(`${P}.title`)}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{t(`${P}.subtitle`)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label={t('shared.close')}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(`${P}.search`)}
              aria-label={t(`${P}.search`)}
              className="w-full rounded-xl border border-gray-200 py-2 pe-3 ps-9 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto p-3">
          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <section aria-labelledby="clinic-contact-doctors">
            <h4 id="clinic-contact-doctors" className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t(`${P}.doctors`)}
            </h4>
            {doctorSection()}
          </section>
          <section aria-labelledby="clinic-contact-patients">
            <h4 id="clinic-contact-patients" className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t(`${P}.patients`)}
            </h4>
            {patientSection()}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
