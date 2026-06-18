import { useState } from 'react';
import type { LabPortalData } from '../../hooks';
import { SectionCard } from './shared/ui';

const PROFILE_TABS = ['🏥 Facility Info', '🧪 Lab Accreditation', '🩻 Radiology Accreditation', '📋 Test & Imaging Menu', '👥 Staff', '⚙️ Integrations'] as const;

export const ProfilePage = ({ data }: { data: LabPortalData | null }) => {
  const [tab, setTab] = useState<string>(PROFILE_TABS[0]);
  const facility = data?.facility;
  const meta = data?.facilityMeta;

  return (
    <div className="space-y-4">
      <SectionCard className="p-4">
        <div className="flex flex-wrap gap-2">
          {PROFILE_TABS.map((t) => (
            <button type="button"
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </SectionCard>

      {tab === '🏥 Facility Info' ? (
        <SectionCard>
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 font-['DM_Mono'] text-xl font-bold text-indigo-600">
              {meta?.shortCode ?? 'DM'}
            </div>
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-slate-900">{facility?.name}</h2>
              {meta?.arabicName ? <p className="text-sm text-slate-500" dir="rtl">{meta.arabicName}</p> : null}
              <p className="mt-2 text-sm text-slate-500">{facility?.address}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              ['Type', meta?.facilityType ?? 'Diagnostic Centre'],
              ['Operating Hours', meta?.operatingHours ?? '24/7'],
              ['Phone', facility?.phone ?? '—'],
              ['Email', facility?.email ?? '—'],
              ['Website', meta?.website ?? '—'],
              ['CeenAiX Integration', meta?.ceenaixIntegration ? `✅ ${meta.ceenaixIntegration}` : '—'],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === '🧪 Lab Accreditation' ? (
        <SectionCard>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🧪 DHA Lab License</h3>
          <p className="mt-2 font-['DM_Mono'] text-sm font-bold text-slate-900">{meta?.dhaLabLicense ?? '—'}</p>
          <p className="mt-1 text-sm text-emerald-700">✅ Valid — expires {meta?.dhaLabExpiry ?? '—'}</p>
          <p className="mt-1 text-xs text-slate-500">{meta?.dhaLabAccreditations ?? '—'}</p>
        </SectionCard>
      ) : null}

      {tab === '🩻 Radiology Accreditation' ? (
        <SectionCard>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🩻 DHA Radiology License</h3>
          <p className="mt-2 font-['DM_Mono'] text-sm font-bold text-slate-900">{meta?.dhaRadiologyLicense ?? '—'}</p>
          <p className="mt-1 text-sm text-emerald-700">✅ Valid — expires {meta?.dhaRadiologyExpiry ?? '—'}</p>
          <p className="mt-1 text-xs text-slate-500">{meta?.dhaRadiologyAccreditations ?? '—'}</p>
        </SectionCard>
      ) : null}

      {tab === '📋 Test & Imaging Menu' || tab === '👥 Staff' || tab === '⚙️ Integrations' ? (
        <SectionCard>
          <p className="text-sm font-semibold text-slate-700">{tab}</p>
          <p className="mt-1 text-sm text-slate-500">This section is coming soon.</p>
        </SectionCard>
      ) : null}
    </div>
  );
};
