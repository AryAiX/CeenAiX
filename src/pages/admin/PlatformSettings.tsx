import { useState, useMemo, useEffect } from 'react';
import { RefreshCw, Settings2, ToggleLeft, ToggleRight } from 'lucide-react';
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
  const flags = context.diagnostics?.featureFlags ?? [];

  const rows = useMemo(
    () => (envFilter === 'all' ? flags : flags.filter((f) => f.environment === envFilter)),
    [flags, envFilter],
  );

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
          onClick={() => context.refetchAll()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </PageHeader>

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
                  <Pill tone={flag.is_enabled ? 'emerald' : 'slate'}>
                    {flag.is_enabled ? 'On' : 'Off'}
                  </Pill>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Rollout</span>
                    <span className="font-semibold">{flag.rollout_percent}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all"
                      style={{ width: `${flag.rollout_percent}%` }}
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
