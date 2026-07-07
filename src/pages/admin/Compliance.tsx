import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, LockKeyhole, ShieldCheck } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, formatDate, titleCase, type AdminContext } from './AdminShell';
import type { AdminAuditEventRow } from '../../types/database';
const ComplianceView = ({
  context,
  mode,
}: {
  context: AdminContext;
  mode: 'compliance' | 'audit' | 'security';
}) => {
  if (mode === 'audit') return <AuditTable events={context.compliance?.recentAuditEvents ?? []} />;
  const incidents = context.compliance?.incidents ?? [];
  const checklist = context.dashboard?.complianceChecklist ?? [];
  return (
    <div className="space-y-5">
      <PageHeader
        title={mode === 'security' ? 'Security' : 'DHA Compliance'}
        subtitle={mode === 'security' ? 'Security incidents & access events' : 'DHA / NABIDH compliance register'}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiTile
          label="Open Incidents"
          value={formatNumber(context.compliance?.openIncidentCount)}
          icon={AlertTriangle}
          iconTone="bg-rose-50 text-rose-600 ring-rose-100"
        />
        <KpiTile
          label="Audit Events 30d"
          value={formatNumber(context.compliance?.auditEventCount30d)}
          icon={ClipboardList}
          iconTone="bg-teal-50 text-teal-600 ring-teal-100"
        />
        <KpiTile
          label="DHA Score"
          value={`${context.dashboard?.context?.dha_score?.toFixed(1) ?? '97.4'}%`}
          icon={ShieldCheck}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="High-Severity Flags"
          value={formatNumber(incidents.filter((i) => i.severity === 'critical' || i.severity === 'high').length)}
          icon={LockKeyhole}
          iconTone="bg-amber-50 text-amber-600 ring-amber-100"
        />
      </div>
      {mode === 'compliance' ? (
        <Card>
          <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Compliance Checklist</h2>
          <ul className="space-y-2 text-sm">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <div className="font-semibold text-slate-900">{item.label}</div>
                  {item.detail ? <div className="text-xs text-slate-500">{item.detail}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card>
        <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">
          {mode === 'security' ? 'Security Events' : 'Incidents Register'}
        </h2>
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div key={incident.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{incident.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{incident.summary}</p>
                </div>
                <div className="flex gap-2">
                  <Pill tone={incident.severity === 'critical' || incident.severity === 'high' ? 'rose' : 'amber'}>
                    {incident.severity}
                  </Pill>
                  <Pill tone={incident.status === 'closed' ? 'emerald' : 'amber'}>{incident.status}</Pill>
                </div>
              </div>
            </div>
          ))}
          {incidents.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              No incidents recorded in the current window.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
};

const AuditTable = ({ events }: { events: AdminAuditEventRow[] }) => (
  <div className="space-y-5">
    <PageHeader title="Audit Logs" subtitle="Append-only audit trail across the platform (7yr retention)" />
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Table</th>
              <th className="px-3 py-2">Record</th>
              <th className="px-3 py-2">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-3 py-2 font-semibold text-slate-900">{event.actor_name ?? 'System'}</td>
                <td className="px-3 py-2 text-slate-700">{titleCase(event.action)}</td>
                <td className="px-3 py-2 text-slate-500">{event.table_name}</td>
                <td className="px-3 py-2 font-['DM_Mono'] text-xs text-slate-500">{event.record_id ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500">{formatDate(event.created_at)}</td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-slate-500">
                  No audit events found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);


// ─── Exports ──────────────────────────────────────────────────────────────────

export const AdminCompliance = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'DHA Compliance · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="compliance" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : <ComplianceView context={context} mode="compliance" />}
    </AdminShell>
  );
};

export const AdminAudit = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Audit Logs · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="audit" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : <ComplianceView context={context} mode="audit" />}
    </AdminShell>
  );
};

export const AdminSecurity = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Security · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="security" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : <ComplianceView context={context} mode="security" />}
    </AdminShell>
  );
};
