import { useEffect } from 'react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, titleCase, type AdminContext } from './AdminShell';
import type { ServiceHealthSnapshot } from '../../types/database';
const ServicesView = ({
  context,
  mode,
}: {
  context: AdminContext;
  mode: 'system' | 'integrations' | 'nabidh';
}) => {
  const services =
    mode === 'integrations'
      ? context.systemHealth?.integrations ?? []
      : mode === 'nabidh'
        ? (context.systemHealth?.integrations ?? []).filter(
            (service) =>
              service.service_name.toLowerCase().includes('nabidh') ||
              service.message?.toLowerCase().includes('nabidh'),
          )
        : [...(context.systemHealth?.services ?? []), ...(context.systemHealth?.aiServices ?? [])];

  return (
    <div className="space-y-5">
      <PageHeader
        title={mode === 'integrations' ? 'Integrations' : mode === 'nabidh' ? 'NABIDH' : 'System Health'}
        subtitle="Latest service health snapshots"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
        {services.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <div className="py-12 text-center text-slate-500">No service checks returned for this category.</div>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

const ServiceCard = ({ service }: { service: ServiceHealthSnapshot }) => (
  <Card>
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">{service.service_name}</h3>
        <p className="text-xs text-slate-500">
          {service.region ?? 'UAE'} · {titleCase(service.category)}
        </p>
      </div>
      <Pill tone={service.status === 'healthy' ? 'emerald' : service.status === 'degraded' ? 'amber' : 'rose'}>
        {service.status}
      </Pill>
    </div>
    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Latency</div>
      <div className="font-['DM_Mono'] text-2xl font-bold text-slate-900">{service.latency_ms ?? 0}ms</div>
    </div>
    <p className="mt-3 text-sm text-slate-500">{service.message ?? 'No current incidents reported.'}</p>
  </Card>
);


// ─── Exports ──────────────────────────────────────────────────────────────────

export const AdminIntegrations = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Integrations · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="integrations" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : (
        <ServicesView context={context} mode="integrations" />
      )}
    </AdminShell>
  );
};

export const AdminSystemHealth = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'System Health · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="system" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : (
        <ServicesView context={context} mode="system" />
      )}
    </AdminShell>
  );
};

export const AdminNabidh = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'NABIDH · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="nabidh" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : (
        <ServicesView context={context} mode="nabidh" />
      )}
    </AdminShell>
  );
};