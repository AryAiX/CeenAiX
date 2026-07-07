import { useEffect } from 'react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, type AdminContext, degradedServiceCount } from './AdminShell';
import { Settings, Terminal, Activity, AlertTriangle } from 'lucide-react';
import type { ServiceHealthSnapshot } from '../../types/database';

const ServiceCard = ({ service }: { service: ServiceHealthSnapshot }) => (
  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
    <div>
      <div className="font-semibold text-slate-900">{service.service_name}</div>
      <div className="text-xs text-slate-500">{service.message ?? service.region ?? service.category}</div>
    </div>
    <div className="flex items-center gap-2">
      <Pill
        tone={
          service.status === 'healthy' ? 'emerald' : service.status === 'degraded' ? 'amber' : 'rose'
        }
      >
        {service.status}
      </Pill>
      <span className="font-['DM_Mono'] text-xs text-slate-500">
        {service.latency_ms != null ? `${service.latency_ms}ms` : '—'}
      </span>
    </div>
  </div>
);

const DiagnosticsView = ({ context }: { context: AdminContext }) => {
  const services = [
    ...(context.systemHealth?.services ?? []),
    ...(context.systemHealth?.integrations ?? []),
    ...(context.systemHealth?.aiServices ?? []),
  ];
  return (
    <div className="space-y-5">
      <PageHeader title="Diagnostics" subtitle="Runtime diagnostics, feature flags, service checks" />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiTile label="Feature Flags" value={formatNumber(context.diagnostics?.featureFlags.length)} icon={Settings} />
        <KpiTile
          label="Platform Settings"
          value={formatNumber(context.diagnostics?.platformSettings.length)}
          icon={Terminal}
        />
        <KpiTile label="Service Checks" value={formatNumber(services.length)} icon={Activity} />
        <KpiTile
          label="Degraded"
          value={formatNumber(degradedServiceCount(context.systemHealth))}
          icon={AlertTriangle}
          iconTone="bg-amber-50 text-amber-600 ring-amber-100"
        />
      </div>
      <Card>
        <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Service health</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </Card>
    </div>
  );
};


export const AdminDiagnostics = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Diagnostics · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="diagnostics" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : <DiagnosticsView context={context} />}
    </AdminShell>
  );
};
