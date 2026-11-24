import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock, Globe, LifeBuoy, Mail, UserRound } from 'lucide-react';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import type { ComingSoonSection } from '../../lib/doctor-settings-sections';
import { dateTimeFormatWithNumerals, resolveLocale } from '../../lib/i18n-ui';

/**
 * QA-177: real content for the doctor Settings sections that used to show a developer note.
 * General, Language and Help use what the app already has; sections that need new features
 * show a clear "Coming soon" card instead (proposed to Tooraj).
 */

const G = 'doctor.settings.general.';

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <div className="rounded-2xl bg-white p-6 shadow-sm">
    <div className="mb-5 flex items-center gap-3">
      {icon}
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    </div>
    {children}
  </div>
);

interface SettingsGeneralProps {
  fullName: string | null;
  email: string | null;
  memberSince: string | null;
  verified: boolean;
  clinicName: string | null;
}

export const SettingsGeneral: React.FC<SettingsGeneralProps> = ({ fullName, email, memberSince, verified, clinicName }) => {
  const { t, i18n } = useTranslation('common');
  const since = memberSince
    ? new Date(memberSince).toLocaleDateString(
        resolveLocale(i18n.language),
        dateTimeFormatWithNumerals(i18n.language, { year: 'numeric', month: 'long' })
      )
    : null;
  const rows: Array<[string, React.ReactNode]> = [
    [t(`${G}name`), fullName || '—'],
    [t(`${G}email`), email ? <bdi>{email}</bdi> : '—'],
    [t(`${G}role`), t(`${G}roleDoctor`)],
    [t(`${G}licence`), verified ? t('doctor.settings.verified') : t('doctor.settings.pending')],
    [t(`${G}clinic`), clinicName || t(`${G}noClinic`)],
    [t(`${G}memberSince`), since || '—'],
  ];

  return (
    <SectionCard icon={<UserRound className="h-6 w-6 text-cyan-600" aria-hidden="true" />} title={t('doctor.settings.sections.general')}>
      <dl className="grid gap-4 sm:grid-cols-2" data-testid="settings-general">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-100 p-4">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/doctor/profile"
          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
        >
          {t(`${G}editProfile`)}
        </Link>
        <Link
          to="/doctor/schedule"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {t(`${G}openSchedule`)}
        </Link>
      </div>
    </SectionCard>
  );
};

export const SettingsLanguage: React.FC = () => {
  const { t } = useTranslation('common');
  const L = 'doctor.settings.language.';
  return (
    <SectionCard icon={<Globe className="h-6 w-6 text-cyan-600" aria-hidden="true" />} title={t('doctor.settings.sections.language')}>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 p-5">
        <div>
          <div className="font-bold text-slate-900">{t(`${L}portalLanguage`)}</div>
          <p className="mt-1 text-sm text-slate-500">{t(`${L}savedOnDevice`)}</p>
        </div>
        <LanguageSwitcher />
      </div>
      <p className="mt-4 text-sm text-slate-500">{t(`${L}englishOnlyNote`)}</p>
    </SectionCard>
  );
};

export const SettingsHelp: React.FC = () => {
  const { t } = useTranslation('common');
  const H = 'doctor.settings.help.';
  return (
    <SectionCard icon={<LifeBuoy className="h-6 w-6 text-cyan-600" aria-hidden="true" />} title={t('doctor.settings.sections.help')}>
      <div className="space-y-4 text-sm text-slate-600">
        <div className="rounded-xl border border-slate-100 p-5">
          <div className="font-bold text-slate-900">{t(`${H}contactTitle`)}</div>
          <p className="mt-1">{t(`${H}contactBody`)}</p>
          <a
            href="mailto:support@ceenaix.com"
            className="mt-3 inline-flex items-center gap-2 font-semibold text-cyan-700 underline"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            <bdi>support@ceenaix.com</bdi>
          </a>
        </div>
        <div className="rounded-xl border border-slate-100 p-5">
          <div className="font-bold text-slate-900">{t(`${H}reportTitle`)}</div>
          <p className="mt-1">{t(`${H}reportBody`)}</p>
        </div>
        <Link to="/privacy" className="inline-block font-semibold text-cyan-700 underline">
          {t(`${H}privacyPolicy`)}
        </Link>
      </div>
    </SectionCard>
  );
};


const COMING_SOON_KEYS: Record<ComingSoonSection, string> = {
  appearance: 'appearance',
  dashboard: 'dashboard',
  'clinical-tools': 'clinicalTools',
  'lab-and-imaging': 'labImaging',
  privacy: 'privacy',
  integrations: 'integrations',
};

export const SettingsComingSoon: React.FC<{ section: ComingSoonSection }> = ({ section }) => {
  const { t } = useTranslation('common');
  const key = COMING_SOON_KEYS[section];
  return (
    <SectionCard icon={<Clock className="h-6 w-6 text-slate-400" aria-hidden="true" />} title={t(`doctor.settings.sections.${key}`)}>
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6" data-testid="settings-coming-soon">
        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
          {t('doctor.settings.comingSoon.badge')}
        </span>
        <p className="mt-3 text-sm text-slate-700">{t(`doctor.settings.comingSoon.${key}`)}</p>
        <p className="mt-2 text-xs text-slate-500">{t('doctor.settings.comingSoon.note')}</p>
      </div>
    </SectionCard>
  );
};
