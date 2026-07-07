import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ClipboardList, Download, Search, ShieldCheck, ShieldAlert } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, formatDate, titleCase, exportRowsToCsv, type AdminContext } from './AdminShell';
import type { AdminAuditEventRow, AdminIncidentSeverity } from '../../types/database';

// ─── Severity tone helper ─────────────────────────────────────────────────────

const SEVERITY_TONE: Record<AdminIncidentSeverity, 'rose' | 'amber' | 'blue' | 'emerald'> = {
  critical: 'rose',
  high: 'rose',
  medium: 'amber',
  low: 'blue',
};

// ─── AuditTable ───────────────────────────────────────────────────────────────

const AuditTable = ({ events }: { events: AdminAuditEventRow[] }) => {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(
      (e) =>
        (e.actor_name ?? '').toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.table_name.toLowerCase().includes(q),
    );
  }, [events, search]);

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" subtitle="Append-only audit trail across the platform (7yr retention)">
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() =>
            exportRowsToCsv(
              rows.map((e) => ({
                actor: e.actor_name ?? 'System',
                action: e.action,
                table: e.table_name,
                record_id: e.record_id ?? '',
                timestamp: e.created_at,
              } satisfies Record<string, unknown>)),
              `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </PageHeader>

      <Card>
        <div className="mb-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action, or table"
            className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Table</th>
                <th className="px-3 py-2">Record</th>
                <th className="px-3 py-2">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-semibold text-slate-900">{event.actor_name ?? 'System'}</td>
                  <td className="px-3 py-2 text-slate-700">{titleCase(event.action)}</td>
                  <td className="px-3 py-2 text-slate-500">{event.table_name}</td>
                  <td className="px-3 py-2 font-['DM_Mono'] text-xs text-slate-500">{event.record_id ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(event.created_at)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-slate-500">
                    No audit events match the current filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Showing {rows.length} of {formatNumber(events.length)} loaded events (capped at 25 per session)
        </div>
      </Card>
    </div>
  );
};

// ─── ComplianceView ───────────────────────────────────────────────────────────

const ComplianceView = ({
  context,
  mode,
}: {
  context: AdminContext;
  mode: 'compliance' | 'audit' | 'security';
}) => {
  if (mode === 'audit') return <AuditTable events={context.compliance?.recentAuditEvents ?? []} />;

  const allIncidents = context.compliance?.incidents ?? [];
  const incidents =
    mode === 'security'
      ? allIncidents.filter((i) => i.severity === 'critical' || i.severity === 'high')
      : allIncidents;

  const checklist = context.dashboard?.complianceChecklist ?? [];
  const openCount = context.compliance?.openIncidentCount ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={mode === 'security' ? 'Security' : 'DHA Compliance'}
        subtitle={
          mode === 'security'
            ? 'High-severity incidents & access events'
            : 'DHA / NABIDH compliance register'
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiTile
          label="Open Incidents"
          value={formatNumber(openCount)}
          caption={openCount === 0 ? 'No active incidents' : 'Require attention'}
          icon={openCount === 0 ? ShieldCheck : ShieldAlert}
          iconTone={
            openCount === 0
              ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
              : 'bg-rose-50 text-rose-600 ring-rose-100'
          }
        />
        <KpiTile
          label="Audit Events 30d"
          value={formatNumber(context.compliance?.auditEventCount30d)}
          icon={ClipboardList}
          iconTone="bg-teal-50 text-teal-600 ring-teal-100"
        />
        <KpiTile
          label="DHA Score"
          value={
            context.dashboard?.context?.dha_score != null
              ? `${context.dashboard.context.dha_score.toFixed(1)}%`
              : '—'
          }
          icon={ShieldCheck}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="High-Severity Flags"
          value={formatNumber(
            allIncidents.filter((i) => i.severity === 'critical' || i.severity === 'high').length,
          )}
          icon={AlertTriangle}
          iconTone="bg-amber-50 text-amber-600 ring-amber-100"
        />
      </div>

      {mode === 'compliance' ? (
        <Card>
          <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Compliance Checklist</h2>
          <ul className="space-y-2 text-sm">
            {checklist.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100"
              >
                {item.is_compliant ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                )}
                <div>
                  <div className="font-semibold text-slate-900">{item.label}</div>
                  {item.detail ? <div className="text-xs text-slate-500">{item.detail}</div> : null}
                  {!item.is_compliant ? (
                    <div className="mt-0.5 text-xs font-semibold text-amber-600">Non-compliant</div>
                  ) : null}
                </div>
              </li>
            ))}
            {checklist.length === 0 ? (
              <li className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
                No checklist items loaded.
              </li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">
          {mode === 'security' ? 'High-Severity Security Incidents' : 'Incidents Register'}
        </h2>
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div key={incident.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">{incident.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{incident.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Detected: {formatDate(incident.detected_at)}</span>
                    {incident.resolved_at ? (
                      <span>Resolved: {formatDate(incident.resolved_at)}</span>
                    ) : null}
                    {incident.affected_records > 0 ? (
                      <span>{formatNumber(incident.affected_records)} records affected</span>
                    ) : null}
                    {incident.regulator_reported ? (
                      <span className="font-semibold text-rose-600">Reported to regulator</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Pill tone={SEVERITY_TONE[incident.severity]}>{titleCase(incident.severity)}</Pill>
                  <Pill tone={incident.status === 'closed' ? 'emerald' : 'amber'}>
                    {titleCase(incident.status)}
                  </Pill>
                </div>
              </div>
            </div>
          ))}
          {incidents.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              {mode === 'security'
                ? 'No high-severity incidents recorded.'
                : 'No incidents recorded in the current window.'}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
};

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
