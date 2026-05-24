import { useTranslation } from 'react-i18next';
import { Flag, RefreshCcw, Settings2, Terminal } from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { useAdminDiagnostics } from '../../hooks';
import { ADMIN_NAV_ITEMS } from './navItems';

export const AdminDiagnostics = () => {
  const { t } = useTranslation('common');
  const { data, loading, error, refetch } = useAdminDiagnostics();

  const flags = data?.featureFlags ?? [];
  const settings = data?.platformSettings ?? [];

  return (
    <OpsShell
      title={t('admin.diagnostics.title')}
      subtitle={t('admin.diagnostics.subtitle')}
      eyebrow="Admin Portal"
      navItems={ADMIN_NAV_ITEMS(t)}
      accent="slate"
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          Failed to load diagnostics: {error}
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-2 inline-flex items-center gap-1 font-semibold underline"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-2 border-b border-slate-200 p-4">
          <Flag className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Feature flags</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Environment</th>
                <th className="px-4 py-3">Rollout %</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Loading flags…
                  </td>
                </tr>
              ) : flags.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No feature flags configured.
                  </td>
                </tr>
              ) : (
                flags.map((flag) => (
                  <tr key={flag.id}>
                    <td className="px-4 py-3 font-mono text-slate-900">{flag.key}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          flag.is_enabled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {flag.is_enabled ? 'enabled' : 'disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{flag.environment}</td>
                    <td className="px-4 py-3 text-slate-600">{flag.rollout_percent}%</td>
                    <td className="px-4 py-3 text-slate-600">{flag.description || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(flag.updated_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-2 border-b border-slate-200 p-4">
          <Settings2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Platform settings</h2>
        </header>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Loading settings…</p>
          ) : settings.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No platform settings defined.</p>
          ) : (
            settings.map((setting) => (
              <div key={setting.id} className="grid gap-2 p-4 md:grid-cols-[minmax(0,1fr)_2fr_auto] md:items-center">
                <div>
                  <p className="font-mono text-sm text-slate-900">{setting.key}</p>
                  <p className="text-xs text-slate-500">
                    Updated {new Date(setting.updated_at).toLocaleString()}
                  </p>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                  {JSON.stringify(setting.value, null, 2)}
                </pre>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                  <Terminal className="h-3 w-3" /> JSON
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </OpsShell>
  );
};
