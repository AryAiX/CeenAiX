import { useEffect } from 'react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, type AdminContext } from './AdminShell';
const SettingsView = ({ context }: { context: AdminContext }) => (
  <div className="space-y-5">
    <PageHeader title="Platform Settings" subtitle="Feature flags, environment configuration, and runtime settings" />
    <div className="grid gap-4 md:grid-cols-2">
      {(context.diagnostics?.featureFlags ?? []).map((flag) => (
        <Card key={flag.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{flag.environment}</div>
              <h3 className="mt-1 font-semibold text-slate-900">{flag.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{flag.description ?? flag.key}</p>
            </div>
            <Pill tone={flag.is_enabled ? 'emerald' : 'slate'}>{flag.is_enabled ? 'On' : 'Off'}</Pill>
          </div>
          <div className="mt-3 text-xs text-slate-500">Rollout: {flag.rollout_percent}%</div>
        </Card>
      ))}
      {context.diagnostics?.featureFlags.length === 0 ? (
        <Card className="md:col-span-2">
          <div className="py-12 text-center text-slate-500">No feature flags defined yet.</div>
        </Card>
      ) : null}
    </div>
  </div>
);


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