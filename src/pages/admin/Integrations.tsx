import { useEffect } from 'react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, exportRowsToCsv, titleCase, type AdminContext } from './AdminShell';
import { Activity, CheckCircle2, AlertTriangle, WifiOff } from 'lucide-react';
import type { ServiceHealthSnapshot } from '../../types/database';

const isNabidhService = (s: ServiceHealthSnapshot) =>
  s.service_name.toLowerCase().includes('nabidh') ||
  s.service_key.toLowerCase().includes('nabidh') ||
  s.message?.toLowerCase().includes('nabidh');

const statusTone = (status: string) =>
  status === 'healthy' ? 'emerald' : status === 'degraded' ? 'amber' : 'rose';

const formatObservedAgo = (observedAt: string): { label: string; isStale: boolean } => {
  const minutesAgo = Math.floor((Date.now() - new Date(observedAt).getTime()) / 60_000);
  if (minutesAgo < 1) return { label: 'just now', isStale: false };
  if (minutesAgo < 60) return { label: `${minutesAgo}m ago`, isStale: minutesAgo > 15 };
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return { label: `${hoursAgo}h ago`, isStale: true };
  const daysAgo = Math.floor(hoursAgo / 24);
  return { label: `${daysAgo}d ago`, isStale: true };
};

const ServiceCard = ({ service }: { service: ServiceHealthSnapshot }) => {
  const observed = formatObservedAgo(service.observed_at);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">{service.service_name}</h3>
          <p className="text-xs text-slate-500">
            {service.region ?? 'UAE'} · {titleCase(service.category)}
          </p>
        </div>
        <Pill tone={statusTone(service.status)}>
          {service.status}
        </Pill>
      </div>
      <p className={`mt-1 text-[11px] ${observed.isStale ? 'font-semibold text-amber-600' : 'text-slate-400'}`}>
        {observed.isStale ? '⚠ ' : ''}Checked {observed.label}
      </p>
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Latency</div>
        <div className="font-['DM_Mono'] text-2xl font-bold text-slate-900">
          {service.latency_ms != null ? `${service.latency_ms}ms` : '—'}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">{service.message ?? 'No current incidents reported.'}</p>
    </Card>
  );
};

const ServiceGrid = ({ services, emptyLabel }: { services: ServiceHealthSnapshot[]; emptyLabel: string }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {services.map((s) => <ServiceCard key={s.id} service={s} />)}
    {services.length === 0 ? (
      <Card className="md:col-span-2 xl:col-span-3">
        <div className="py-12 text-center text-slate-500">{emptyLabel}</div>
      </Card>
    ) : null}
  </div>
);

const ServicesView = ({
  context,
  mode,
}: {
  context: AdminContext;
  mode: 'system' | 'integrations' | 'nabidh';
}) => {
  const platformServices = context.systemHealth?.services ?? [];
  const integrations = context.systemHealth?.integrations ?? [];
  const aiServices = context.systemHealth?.aiServices ?? [];

  const services =
    mode === 'integrations'
      ? integrations
      : mode === 'nabidh'
        ? integrations.filter(isNabidhService)
        : [...platformServices, ...aiServices];

  const healthy = services.filter((s) => s.status === 'healthy').length;
  const degraded = services.filter((s) => s.status === 'degraded').length;
  const down = services.filter((s) => s.status === 'down').length;
  const unknown = services.filter((s) => s.status === 'unknown').length;

  const subtitle =
    mode === 'integrations'
      ? 'Third-party API connection health'
      : mode === 'nabidh'
        ? 'NABIDH HIE connection status and latency'
        : 'Platform core services and AI infrastructure health';

  const title =
    mode === 'integrations' ? 'Integrations' : mode === 'nabidh' ? 'NABIDH' : 'System Health';

  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle={subtitle}>
        <button
          type="button"
          onClick={() => context.refetchSystemHealth()}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
        <button
          type="button"
          disabled={services.length === 0}
          onClick={() =>
            exportRowsToCsv(
              services.map((s) => ({
                service_name: s.service_name,
                service_key: s.service_key,
                category: s.category,
                status: s.status,
                latency_ms: s.latency_ms ?? '',
                region: s.region ?? '',
                message: s.message ?? '',
                observed_at: s.observed_at,
              } satisfies Record<string, unknown>)),
              `${mode}-health-${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Export
        </button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Healthy"
          value={formatNumber(healthy)}
          caption={`of ${services.length} total`}
          icon={CheckCircle2}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="Degraded"
          value={formatNumber(degraded)}
          caption="Elevated latency or partial outage"
          icon={AlertTriangle}
          iconTone="bg-amber-50 text-amber-600 ring-amber-100"
        />
        <KpiTile
          label="Down"
          value={formatNumber(down)}
          caption={down > 0 ? 'Immediate action required' : 'None reported ✅'}
          icon={WifiOff}
          iconTone={down > 0 ? 'bg-rose-50 text-rose-600 ring-rose-100' : 'bg-slate-50 text-slate-600 ring-slate-100'}
        />
        <KpiTile
          label="Unknown"
          value={formatNumber(unknown)}
          caption={unknown > 0 ? 'Status could not be determined' : 'All statuses confirmed ✅'}
          icon={Activity}
          iconTone={unknown > 0 ? 'bg-slate-100 text-slate-600 ring-slate-200' : 'bg-slate-50 text-slate-600 ring-slate-100'}
        />
      </div>

      {mode === 'system' ? (
        <div className="space-y-5">
          <div>
            <h2 className="mb-3 font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-700">Platform Services</h2>
            <ServiceGrid services={platformServices} emptyLabel="No platform service checks returned." />
          </div>
          <div>
            <h2 className="mb-3 font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-700">AI Services</h2>
            <ServiceGrid services={aiServices} emptyLabel="No AI service checks returned." />
          </div>
        </div>
      ) : (
        <ServiceGrid services={services} emptyLabel="No service checks returned for this category." />
      )}
    </div>
  );
};


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