import { useState, useMemo, useEffect } from 'react';
import { RefreshCw, Settings2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { updateFeatureFlag } from '../../hooks';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, formatDate, type AdminContext } from './AdminShell';
import type { FeatureFlagEnvironment } from '../../types/database';

const ENV_TABS: { key: FeatureFlagEnvironment | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'production', label: 'Production' },
  { key: 'staging', label: 'Staging' },
  { key: 'development', label: 'Development' },
];

const ENV_TONE: Record<FeatureFlagEnvironment, 'rose' | 'amber' | 'blue'> = {
  production: 'rose',
  staging: 'amber',
  development: 'blue',
};

const SettingsView = ({ context }: { context: AdminContext }) => {
  const [envFilter, setEnvFilter] = useState<FeatureFlagEnvironment | 'all'>('all');
  const [savingFlagId, setSavingFlagId] = useState<string | null>(null);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<typeof rows[number] | null>(null);
  const [rolloutDrafts, setRolloutDrafts] = useState<Record<string, number>>({});
  const flags = context.diagnostics?.featureFlags ?? [];
  const settings = context.diagnostics?.platformSettings ?? [];

  const rows = useMemo(
    () => (envFilter === 'all' ? flags : flags.filter((f) => f.environment === envFilter)),
    [flags, envFilter],
  );

  const applyFlagUpdate = async (
    flag: typeof rows[number],
    isEnabled: boolean,
    rolloutPercent: number,
  ) => {
    setSavingFlagId(flag.id);
    setFlagError(null);
    try {
      await updateFeatureFlag({ id: flag.id, isEnabled, rolloutPercent });
      context.refetchDiagnostics();
    } catch (err) {
      setFlagError(err instanceof Error ? err.message : 'Failed to update flag');
    } finally {
      setSavingFlagId(null);
    }
  };

  const handleToggle = (flag: typeof rows[number]) => {
    if (flag.environment === 'production') {
      setConfirmToggle(flag);
      return;
    }
    void applyFlagUpdate(flag, !flag.is_enabled, flag.rollout_percent);
  };

  const enabledCount = flags.filter((f) => f.is_enabled).length;
  const prodCount = flags.filter((f) => f.environment === 'production').length;
  const ctx = context.dashboard?.context;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform Settings"
        subtitle="Feature flags, environment configuration, and runtime settings"
      >
        <button
          type="button"
          onClick={() => {
            context.refetchDashboard();
            context.refetchDiagnostics();
          }}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </PageHeader>

      {flagError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {flagError}
        </div>
      ) : null}

      {ctx ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Platform Version"
            value={ctx.platform_version}
            caption={ctx.environment_label}
            icon={Settings2}
            iconTone="bg-teal-50 text-teal-600 ring-teal-100"
          />
          <KpiTile
            label="Total Flags"
            value={formatNumber(flags.length)}
            caption={`${formatNumber(prodCount)} in production`}
            icon={ToggleRight}
            iconTone="bg-blue-50 text-blue-600 ring-blue-100"
          />
          <KpiTile
            label="Enabled"
            value={formatNumber(enabledCount)}
            caption={`${formatNumber(flags.length - enabledCount)} disabled`}
            icon={ToggleRight}
            iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
          />
          <KpiTile
            label="Disabled"
            value={formatNumber(flags.length - enabledCount)}
            caption={`${flags.length ? ((enabledCount / flags.length) * 100).toFixed(0) : 0}% flags active`}
            icon={ToggleLeft}
            iconTone="bg-slate-100 text-slate-600 ring-slate-200"
          />
        </div>
      ) : null}

      <Card>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {ENV_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setEnvFilter(tab.key)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                envFilter === tab.key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              {tab.key !== 'all' ? (
                <span className="ml-1 opacity-70">
                  ({flags.filter((f) => f.environment === tab.key).length})
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {rows.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((flag) => (
              <div
                key={flag.id}
                className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Pill tone={ENV_TONE[flag.environment]}>{flag.environment}</Pill>
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-900">{flag.name}</h3>
                    <p className="mt-0.5 font-['DM_Mono'] text-xs text-slate-500">{flag.key}</p>
                    {flag.description ? (
                      <p className="mt-1 text-sm text-slate-500">{flag.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(flag)}
                    disabled={savingFlagId === flag.id}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition disabled:opacity-50 ${
                      flag.is_enabled
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {savingFlagId === flag.id ? '…' : flag.is_enabled ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Rollout</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rolloutDrafts[flag.id] ?? flag.rollout_percent}
                        onChange={(e) =>
                          setRolloutDrafts((d) => ({ ...d, [flag.id]: Number(e.target.value) }))
                        }
                        className="w-14 rounded-lg border border-slate-200 px-1.5 py-0.5 text-right font-semibold"
                      />
                      <span>%</span>
                      {rolloutDrafts[flag.id] != null && rolloutDrafts[flag.id] !== flag.rollout_percent ? (
                        <button
                          type="button"
                          onClick={() => {
                            const value = rolloutDrafts[flag.id];
                            setRolloutDrafts((d) => {
                              const next = { ...d };
                              delete next[flag.id];
                              return next;
                            });
                            void applyFlagUpdate(flag, flag.is_enabled, value);
                          }}
                          disabled={savingFlagId === flag.id}
                          className="rounded-lg bg-teal-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all"
                      style={{ width: `${rolloutDrafts[flag.id] ?? flag.rollout_percent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                  <span>Updated {formatDate(flag.updated_at)}</span>
                  {flag.updated_by ? <span>by {flag.updated_by}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            {flags.length === 0
              ? 'No feature flags defined yet.'
              : `No flags in the "${envFilter}" environment.`}
          </div>
        )}
      </Card>

      {settings.length > 0 ? (
        <Card>
          <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">
            Runtime Configuration ({settings.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-['DM_Mono'] text-xs font-semibold text-slate-900">
                      {setting.key}
                    </td>
                    <td className="px-3 py-2 font-['DM_Mono'] text-xs text-slate-600">
                      {JSON.stringify(setting.value)}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{formatDate(setting.updated_at)}</td>
                    <td className="px-3 py-2 text-slate-500">{setting.updated_by ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {confirmToggle ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmToggle(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {confirmToggle.is_enabled ? 'Disable' : 'Enable'} in production?
              </h3>
              <button
                type="button"
                onClick={() => setConfirmToggle(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500">
              "{confirmToggle.name}" is a production flag. This change takes effect
              immediately on the live platform.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmToggle(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const flag = confirmToggle;
                  setConfirmToggle(null);
                  void applyFlagUpdate(flag, !flag.is_enabled, flag.rollout_percent);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                {confirmToggle.is_enabled ? 'Disable' : 'Enable'} Flag
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const AdminPlatformSettings = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Platform Settings · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="settings" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : <SettingsView context={context} />}
    </AdminShell>
  );
};
