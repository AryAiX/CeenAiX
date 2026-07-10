import { useEffect } from 'react';
import { Activity, AlertTriangle, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import AdminShell, {
  useAdminContextValue,
  Card,
  Pill,
  PageHeader,
  KpiTile,
  formatNumber,
  formatDate,
  exportRowsToCsv,
  degradedServiceCount,
  type AdminContext,
} from './AdminShell';
import type { ServiceHealthCategory, ServiceHealthSnapshot } from '../../types/database';

// ─── ServiceCard ──────────────────────────────────────────────────────────────

const ServiceCard = ({ service }: { service: ServiceHealthSnapshot }) => (
  <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
    <div className="min-w-0 flex-1">
      <div className="font-semibold text-slate-900">{service.service_name}</div>
      <div className="font-['DM_Mono'] text-[10px] text-slate-400">{service.service_key}</div>
      {service.message ? (
        <div className="mt-0.5 text-xs text-slate-500">{service.message}</div>
      ) : null}
      <div className="mt-1 text-[10px] text-slate-400">
        Observed {formatDate(service.observed_at)}
        {service.region ? ` · ${service.region}` : ''}
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <Pill
        tone={
          service.status === 'healthy'
            ? 'emerald'
            : service.status === 'degraded'
              ? 'amber'
              : 'rose'
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

// ─── ServiceSection ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ServiceHealthCategory, string> = {
  core: 'Core Services',
  integration: 'Integrations',
  ai: 'AI Services',
};

const ServiceSection = ({
  category,
  services,
}: {
  category: ServiceHealthCategory;
  services: ServiceHealthSnapshot[];
}) => {
  if (services.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
        {CATEGORY_LABELS[category]}
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
};

// ─── DiagnosticsView ──────────────────────────────────────────────────────────

const DiagnosticsView = ({ context }: { context: AdminContext }) => {
  const coreServices = context.systemHealth?.services ?? [];
  const integrationServices = context.systemHealth?.integrations ?? [];
  const aiServices = context.systemHealth?.aiServices ?? [];
  const allServices = [...coreServices, ...integrationServices, ...aiServices];

  const degraded = degradedServiceCount(context.systemHealth);

  const handleExport = () => {
    exportRowsToCsv(
      allServices.map((s) => ({
        service_key: s.service_key,
        service_name: s.service_name,
        category: s.category,
        status: s.status,
        latency_ms: s.latency_ms ?? '',
        region: s.region ?? '',
        message: s.message ?? '',
        observed_at: s.observed_at,
      } satisfies Record<string, unknown>)),
      `diagnostics-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Diagnostics" subtitle="Runtime diagnostics, feature flags, service checks">
        <button
          type="button"
          onClick={() => {
            context.refetchSystemHealth();
            context.refetchDiagnostics();
          }}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
        <button
          type="button"
          disabled={allServices.length === 0}
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <KpiTile
          label="Service Checks"
          value={formatNumber(allServices.length)}
          caption={`${coreServices.length} core · ${aiServices.length} AI`}
          icon={Activity}
          iconTone="bg-slate-100 text-slate-600 ring-slate-200"
        />
        <KpiTile
          label="Degraded"
          value={formatNumber(degraded)}
          caption={degraded === 0 ? 'All services healthy' : 'Require attention'}
          icon={degraded === 0 ? ShieldCheck : AlertTriangle}
          iconTone={
            degraded === 0
              ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
              : 'bg-amber-50 text-amber-600 ring-amber-100'
          }
        />
      </div>

      <Card>
        <h2 className="mb-5 font-['Plus_Jakarta_Sans'] text-lg font-bold">Service Health</h2>
        {allServices.length > 0 ? (
          <div className="space-y-6">
            <ServiceSection category="core" services={coreServices} />
            <ServiceSection category="integration" services={integrationServices} />
            <ServiceSection category="ai" services={aiServices} />
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">No service health data available.</div>
        )}
      </Card>

    </div>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

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
