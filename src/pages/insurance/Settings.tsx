import { useState } from 'react';
import { setInsuranceSettingEnabled } from '../../hooks';
import InsuranceShell, {
  useInsurancePageData,
} from './InsuranceShell';

export const InsuranceSettings = () => {
  const { data, error, refetch } = useInsurancePageData();
  const settings = data?.settings ?? [];
  const profile = data?.profile;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const handleToggleSetting = async (settingId: string, nextEnabled: boolean) => {
    setSettingsError(null);
    setBusyId(settingId);
    try {
      await setInsuranceSettingEnabled(settingId, nextEnabled);
      refetch();
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : 'Could not update insurance setting.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const grouped: Record<string, typeof settings> = {};
  settings.forEach((s) => {
    const k = s.settingKey.toLowerCase();
    let cat = 'General';
    if (k.includes('ai') || k.includes('auto')) cat = 'AI & Automation';
    else if (k.includes('alert') || k.includes('notif')) cat = 'Alerts & Notifications';
    else if (k.includes('compliance') || k.includes('dha') || k.includes('audit')) cat = 'Compliance & Audit';
    else if (k.includes('fraud') || k.includes('risk')) cat = 'Fraud & Risk';
    grouped[cat] = grouped[cat] ?? [];
    grouped[cat].push(s);
  });

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      {profile ? (
        <article className="rounded-2xl border border-slate-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">{profile.displayName}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {profile.regulatorName}
                {profile.arabicName ? <span className="ml-2 text-slate-400">· {profile.arabicName}</span> : null}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Officer: <span className="font-semibold">{profile.officerName}</span> · {profile.officerTitle}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3 text-xs ring-1 ring-violet-100">
              <div className="font-bold text-slate-700">SLA Targets</div>
              <div className="mt-1 text-slate-500">
                Standard: <span className="font-mono font-bold">{profile.slaTargetStandardHours ?? '—'}h</span>
              </div>
              <div className="text-slate-500">
                Urgent: <span className="font-mono font-bold">{profile.slaTargetUrgentHours ?? '—'}h</span>
              </div>
            </div>
          </div>
        </article>
      ) : null}

      <div className="space-y-5">
        {settingsError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {settingsError}
          </div>
        ) : null}

        {Object.entries(grouped).map(([category, items]) => (
          <article key={category} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-[15px] font-bold text-slate-900">{category}</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {items.length} preference{items.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{setting.title}</div>
                    <div className="text-xs text-slate-500">{setting.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToggleSetting(setting.id, !setting.enabled)}
                    disabled={busyId === setting.id}
                    aria-pressed={setting.enabled}
                    aria-label={setting.enabled ? 'Disable preference' : 'Enable preference'}
                    className={`relative h-6 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${setting.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${setting.enabled ? 'translate-x-6' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </article>
        ))}

        {settings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No settings configured.
          </div>
        ) : null}
      </div>
    </InsuranceShell>
  );
};

export default InsuranceSettings;